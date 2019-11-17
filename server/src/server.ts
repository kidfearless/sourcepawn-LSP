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
import { SMDefinition, ACNode } from './condensor/definitions/definition';
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

var definitions = new SMDefinition();

function OnInitialize(params: InitializeParams): InitializeResult
{
	let ret:InitializeResult = 
	{
		capabilities:
		{
			// since TextDocuments only supports full document sync this just returns full.
			textDocumentSync: documents.syncKind,
			definitionProvider: false,
			// Tell the client that the server supports code completion
			completionProvider:
			{
				resolveProvider: false,
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

documents.onDidSave(function(change: TextDocumentChangeEvent)
{
	let root:string = cwd();
	definitions = new SMDefinition();
	definitions.AppendFiles(root);

});

documents.onDidOpen(function(change: TextDocumentChangeEvent)
{
	let root:string = cwd();
	definitions = new SMDefinition();
	definitions.AppendFiles(root);

});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(function(change: TextDocumentChangeEvent)
{
	Strings.FindStrings(change.document);
	Comments.FindComments(change.document);

	Defininitions.FindDefines(change.document);
	MethodMaps.FindMethodMaps(change.document);
	let tokens = Tokenizer.Tokenize(change.document);

	let types:string[] = definitions.TypeStrings.filter((value:string, index:number, self: string[]) =>
	{
		return self.indexOf(value) === index;
	});

	Variables.FindVariables(change.document, types);
});

connection.onDidChangeWatchedFiles(function(_change)
{
	// Monitored files have change in VSCode
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	function(textDocumentPosition: CompletionParams): CompletionItem[]
	{
		let defines = Defininitions.GetDefines();
		let methodmaps = MethodMaps.GetMethodMaps();
		let variables = Variables.GetVariables();

		let doc: TextDocument|undefined = documents.get(textDocumentPosition.textDocument.uri);
		if(doc !== undefined)
		{
			let lineItem:string = doc.getText(Range.create(textDocumentPosition.position.line, 0, textDocumentPosition.position.line, textDocumentPosition.position.character));
			if(IsDotTrigger(lineItem, textDocumentPosition.position.character))
			{
				let allMethods: CompletionItem[] = [];
				definitions.MethodsStrings.forEach((value:string) =>                                                                                        
				{
					let item: CompletionItem = CompletionItem.create(value);
					item.kind = CompletionItemKind.Method;
					allMethods.push(item);
				});
				
				definitions.FieldStrings.forEach((value:string) =>
				{
					let item: CompletionItem = CompletionItem.create(value);
					item.kind = CompletionItemKind.Property;
					allMethods.push(item);
				});


				let map:Map<string, CompletionItem> = new Map();

				for(let i = 0 ; i < allMethods.length; ++i)
				{
					map.set(allMethods[i].label, allMethods[i]);
				}

				return Array.from(map.values());
			}
		}

		let variableMap:Map<string, CompletionItem> = new Map();

		for(let i = 0 ; i < variables.length; ++i)
		{
			variableMap.set(variables[i].label, variables[i]);
		}

		variables = Array.from(variableMap.values());

		return defines.concat(methodmaps).concat(variables);
	}
);

/* 

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	function(item: CompletionItem): CompletionItem
	{
		return item;
	}
); */

