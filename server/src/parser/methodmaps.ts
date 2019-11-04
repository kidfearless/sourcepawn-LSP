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
import {FindClosingBrace} from '../utils';

export var g_MethodMaps: Map<string, Variable> = new Map();

// Finds all the defines in the current text document and saves them the g_Defines
export function FindMethodMaps(textDocument: TextDocument): void
{
	// get the current document as one long string
	let text:string = textDocument.getText();
	
	// creates a methodmap patter that matches 'methodmap' and at least one valid word
	// it will also match a second word if it comes after the '<' symbol
	// and finally to make my life easier it matches the opening brace so that I can easily begin the search for the closing brace
	let definePattern: RegExp = /methodmap\s+(\w+)\s*(<\s*(\w+))?\s*{/g;
	
	// let definePattern: RegExp = /methodmap\s+\w+(\s*<\s*\w+)?\s*{/g;
		
	// Holds an array of matches from the definePattern above
	// Due to how it's written it will only ever hold one value
	let match: RegExpExecArray | null;
	// math[0]: "methodmap ArrayList < Handle \n{"
	// math[1]: "ArrayList"
	// math[2]: "< Handle"
	// math[3]: "Handle"
	while ((match = definePattern.exec(text)))
	{
		let methodmapName:string = match[1];
		
		// create a new variable with a classname of itself, since it's its own data type.
		let newClass: Variable = new Variable(methodmapName, methodmapName, CompletionItemKind.Class);

		// If we found a possible parent class try to inherit it.
		if(match[3] !== undefined)
		{
			let parentClass: Variable | undefined = g_MethodMaps.get(match[3]);
			if(parentClass !== undefined)
			{
				newClass.inherit(parentClass);
			}
		}

		// find the location of the name inside the orignal match.
		// this is for people who like to put their stuff on separate lines
		let indexof = match[0].substr('methodmap'.length).indexOf(methodmapName) + 'methodmap'.length;

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

		let closingIndex:number = FindClosingBrace(text, match.index + match[0].length);
		let closingPosition: Position = textDocument.positionAt(closingIndex);
		
		// add it to the list of definitions
		g_MethodMaps.set(newClass.label, newClass);
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