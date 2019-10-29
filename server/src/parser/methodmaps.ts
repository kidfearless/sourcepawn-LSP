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
	Range,
	Location,
	Position,
	LocationLink
} from 'vscode-languageserver';

import {Variable} from '../classes';

export var g_MethodMaps: Variable[] = [];

// Finds all the defines in the current text document and saves them the g_Defines
export function FindMethodMaps(textDocument: TextDocument): void
{
	// clear the current array to prevent duplicates
	g_MethodMaps = [];

	// get the current document as one long string
	let text:string = textDocument.getText();
	
	// create a pattern to match 'methodmap' and a series of characters with any number of whitespace in-between
	// this is because using match groups will cause exec to always return the same match
	let definePattern: RegExp = /methodmap\s+\w+/g;

	// Holds an array of matches from the definePattern above
	// Due to how it's written it will only ever hold one value
	let match: RegExpExecArray | null;
	
	while ((match = definePattern.exec(text)))
	{
		// extract the define name from the full match(0) by removing the keyword and trimming any outer whitespace.
		// since we're only after the name at this part we don't need to split
		let methodmapName:string = match[0].replace('methodmap', '').trim();

		// create a new variable with a classname of itself, since it's its own data type.
		let newClass: Variable = new Variable(methodmapName, methodmapName, CompletionItemKind.Class);

		// find the location of the name inside the orignal match.
		// this is for people who like to put their stuff on separate lines
		let indexof = match[0].indexOf(methodmapName);

		// create a position based of the original match location and and the name postion from within the match
		let definitionStart: Position = textDocument.positionAt(match.index + indexof);

		// Create the end location based off of where we found the start position and offset it by the length of the define name
		let definitionEnd: Position = Position.create(definitionStart.line, definitionStart.character + methodmapName.length);

		// now we make a range from the two positions
		let defineRange: Range = Range.create(definitionStart, definitionEnd);

		// and finally we link it to the document that it was found
		let defineLocation: LocationLink = LocationLink.create(textDocument.uri, defineRange, defineRange);

		// link it with the Variable object
		newClass.declarationLocation = defineLocation;
		
		// add it to the list of definitions
		g_MethodMaps.push(newClass);
		// TODO: add property, method, and constructor parsing
	}	
}

// returns a list of all the completion items and their methods and properties
export function GetMethodMaps(): CompletionItem[]
{
	let returnValue: CompletionItem[] = [];
	g_MethodMaps.forEach(
		function(value: Variable)
		{
			returnValue = returnValue.concat(value.toCompletionItems());
		}
	);
	return returnValue;
}