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

export var g_Defines: Variable[] = [];

// Finds all the defines in the current text document and saves them the g_Defines
export function FindDefines(textDocument: TextDocument): void
{
	// clear the current array to prevent duplicates
	g_Defines = [];

	// get the current document as one long string
	let text:string = textDocument.getText();
	
	// create a pattern to match '#define' and a series of characters with any number of whitespace in-between
	// this is because using match groups will cause exec to always return the same match
	let definePattern: RegExp = /\#define\s+\w+/g;

	// Holds an array of matches from the definePattern above
	// Due to how it's written it will only ever hold one value
	let match: RegExpExecArray | null;
	
	while ((match = definePattern.exec(text)))
	{
		// extract the define name from the full match(0) by removing the define keyword and triming any outer whitespace.
		// then we split on the inner whitespace and return the first non whitespace
		let defineVariable = match[0].replace('#define', '').trim().split(/\s+/)[0];

		// create a new variable with the classname of null, since we can't currently dermine it's type
		let newDefine: Variable = new Variable(defineVariable, null, CompletionItemKind.Constant);

		// find the location of the name inside the orignal match.
		// this is for people who like to tab so much that their defines are right alligned
		let indexof = match[0].indexOf(defineVariable);

		// create a position based of the original match location and and the name postion from within the match
		let definitionStart: Position = textDocument.positionAt(match.index + indexof);

		// Create the end location based off of where we found the start position and offset it by the length of the define name
		let definitionEnd: Position = Position.create(definitionStart.line, definitionStart.character + defineVariable.length);

		// now we make a range from the two positions
		let defineRange: Range = Range.create(definitionStart, definitionEnd);

		// and finally we link it to the document that it was found
		let defineLocation: LocationLink = LocationLink.create(textDocument.uri, defineRange, defineRange);

		// link it with the Variable object
		newDefine.declarationLocation = defineLocation;
		
		// add it to the list of definitions
		g_Defines.push(newDefine);
	}	
}
// returns a list of all the completion items and their methods and properties
// In this case it just returns the defines
export function GetDefines(): CompletionItem[]
{
	let returnValue: CompletionItem[] = [];
	g_Defines.forEach(
		function(value: Variable)
		{
			returnValue = returnValue.concat(value.toCompletionItems());
		}
	);
	return returnValue;
}