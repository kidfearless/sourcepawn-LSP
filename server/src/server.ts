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
	CompletionParams,
} from 'vscode-languageserver';

import * as Defininitions from "./parser/defines";
import * as MethodMaps from "./parser/methodmaps";
import * as Variables from "./parser/variables";
import * as Comments from "./parser/comments";
import * as Strings from "./parser/strings";
import * as Tokenizer from "./parser/sptokenizer";
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

import
{
	LinkLocationToString,
	IsStringTrigger,
	IsDotTrigger
} from './utils';
import { SMDefinition } from './condensor/definitions/definition';
import { parse, join } from 'path';
import { cwd } from 'process';

// Creates a new connection to the client for all current and proposed features.
// We won't use them all but it makes it easier
export var connection = createConnection(ProposedFeatures.all);
// Creates a link to all the documents that the connection has access too
let documents: TextDocuments = new TextDocuments();

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);


// Listen on the connection
connection.listen();

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
				resolveProvider: true,
				triggerCharacters: ['.']
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

var def = new SMDefinition();
documents.onDidSave(function(change: TextDocumentChangeEvent)
{
	let root:string = cwd();
	let finished = function()
	{
		console.log(def.Methodmaps);
	};
	def.AppendFiles(root, finished);

});



// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(function(change: TextDocumentChangeEvent)
{
	Strings.FindStrings(change.document);
	Comments.FindComments(change.document);
	/* Strings.g_StringLocations.forEach(
		function(location: LocationLink)
		{
			connection.console.log('string found at');
			connection.console.log(LinkLocationToString(location));
		}
	);
	Comments.g_CommentLocations.forEach(
		function(loc: LocationLink)
		{
			connection.client.connection.console.log('comment found at');
			connection.console.log(LinkLocationToString(loc));
		}
	);
 */
	Defininitions.FindDefines(change.document);
	MethodMaps.FindMethodMaps(change.document);
	let tokens = Tokenizer.Tokenize(change.document);
	Variables.FindVariables(change.document);
});

connection.onDidChangeWatchedFiles(function(_change)
{
	// Monitored files have change in VSCode
	connection.console.log('We received an onDidChangeWatchedFiles');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	function(textDocumentPosition: CompletionParams): CompletionItem[]
	{
		let defines = Defininitions.GetDefines();
		let methodmaps = MethodMaps.GetMethodMaps();
		let variables = Variables.GetVariables();
		let myClass: CompletionItem = CompletionItem.create('MyClass');
		myClass.kind = CompletionItemKind.Class;

		let doc: TextDocument|undefined = documents.get(textDocumentPosition.textDocument.uri);
		if(doc !== undefined)
		{
			let lineItem:string = doc.getText(Range.create(textDocumentPosition.position.line, 0, textDocumentPosition.position.line, textDocumentPosition.position.character));
			//if(IsStringTrigger('MyClass', lineItem, textDocumentPosition.position.character)/*  && IsDotTrigger(lineItem, textDocumentPosition.position.character) !== false */)
			{
				let lengthCompletion: CompletionItem = CompletionItem.create('Length');
				lengthCompletion.kind = CompletionItemKind.Property;
				methodmaps = methodmaps.concat(lengthCompletion);
			}

		}
		else
		{
			connection.console.log('undefined document');
		}
		
		//completion.filterText = completion.insertText = 'MyClass.Length';
		//completion.kind = CompletionItemKind.Property;
		// completion.commitCharacters = ['.'];
		return defines.concat(methodmaps).concat(variables).concat(myClass);

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

