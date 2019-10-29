/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import
{
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	InitializeResult,
	ConfigurationItem,
	TextDocumentChangeEvent,
	DiagnosticRelatedInformation,
	PublishDiagnosticsParams,
	ClientCapabilities,
	DidChangeConfigurationParams,
	CancellationToken,
	LocationLink,
	Definition,
	DefinitionLink,
	Range,
	Location,
	Position,
} from 'vscode-languageserver';

import * as Defininitions from "./parser/defines";
import * as MethodMaps from "./parser/methodmaps";
import * as Variables from "./parser/variables";
import * as path from "path";
import * as fs from 'fs';
import { HandlerResult } from 'vscode-jsonrpc';


// Creates a new connection to the client for all current and proposed features.
// We won't use them all but it makes it easier
export var connection = createConnection(ProposedFeatures.all);
// Creates a link to all the documents that the connection has access too
let documents: TextDocuments = new TextDocuments();

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
let completions:CompletionItem[] = [];

function OnInitialize(params: InitializeParams): InitializeResult
{
	let ret:InitializeResult = 
	{
		capabilities:
		{
			// since TextDocuments only supports full document sync this just returns full.
			textDocumentSync: documents.syncKind,
			definitionProvider: true,
			// Tell the client that the server supports code completion
			completionProvider:
			{
				resolveProvider: false
			}
			// We aren't there yet
			/* ,
			signatureHelpProvider: {
				triggerCharacters: ["("]
			} */
		}
	};

	return ret;
}

connection.onInitialize(OnInitialize);


// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(function(change: TextDocumentChangeEvent)
{
	Defininitions.FindDefines(change.document);
	MethodMaps.FindMethodMaps(change.document);
	Variables.FindVariables(change.document);
});

connection.onDidChangeWatchedFiles(function(_change)
{
	// Monitored files have change in VSCode
	connection.console.log('We received an onDidChangeWatchedFiles');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	function(textDocumentPosition: TextDocumentPositionParams): CompletionItem[]
	{
		let defines = Defininitions.GetDefines();
		let methodmaps = MethodMaps.GetMethodMaps();
		let variables = Variables.GetVariables();
		return defines.concat(methodmaps).concat(variables);
	}
);


/* async function onDefinition(documentParams: TextDocumentPositionParams): Promise<Definition | DefinitionLink[] | undefined>
{
	let currentDoc: TextDocument | undefined = documents.get(documentParams.textDocument.uri);
	if(!currentDoc)
	{
		return undefined;
	}
	let endLineLength = currentDoc.getText().split('\n')[documentParams.position.line].length;
	// 
	let range = Range.create(documentParams.position, Position.create(documentParams.position.line, endLineLength));

	connection.client.connection.console.error(currentDoc.getText(range));
	return undefined;
}

connection.onDefinition(onDefinition); */

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	function(item: CompletionItem): CompletionItem
	{
		connection.console.log('received onCompletionResolve event');
		return item;
	}
);

// Listen on the connection
connection.listen();


async function validateTextDocument(textDocument: TextDocument): Promise<void>
{
	// The validator creates diagnostics for all uppercase words length 2 and more
	let text = textDocument.getText();
	let definePattern = /\#define\s+\w+/g;
	let match: RegExpExecArray | null;

	let problems = 0;
	while ((match = definePattern.exec(text)) && problems < 10)
	{
		problems++;
		// extract the define name from the match
		let defineVariable = match[0].replace('#define', '').trim();
		// find the location of the name inside the orignal match.
		// this is for people who like to tab so much that their defines are right alligned
		let indexof = match[0].indexOf(defineVariable);

		let completion: CompletionItem = CompletionItem.create(defineVariable);
		completion.kind = CompletionItemKind.Constant;
		completion.deprecated = true;
		completions.push(completion);
	}	
}
