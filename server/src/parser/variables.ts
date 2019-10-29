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
import {connection} from '../server';
export var g_Variables: Variable[] = [];

// Finds all the defines in the current text document and saves them the g_Defines
export function FindVariables(textDocument: TextDocument): void
{
	// clear the current array to prevent duplicates
	g_Variables = [];

	// get the current document as one long string
	let text:string = textDocument.getText();

	FindBaseVariables(textDocument, text);
	// FindCustomVariables(textDocument, text);
}

function FindBaseVariables(textDocument: TextDocument, text: string): void
{
	// I'm not supporting adding proper functionality to old syntax. If I do it's to mark them as deprecated and suggest they remove it from their plugin.
	const defaultDataTypes:string[] = ['float', 'int', 'char', 'Handle', 'bool'];

	for(let i = 0; i < defaultDataTypes.length; ++i)
	{
		// shorthand copy of the current datatype
		let dataType:string = defaultDataTypes[i];
		// Creates a regular expression to find any declaration statements including ones where there might be multiple variables declared.
		let dataTypePattern = new RegExp(`${dataType}\\s+[\\w\\s,=+\\-*/\\d.()\\[\\]]+;`, 'g');
		// (float|bool|char|int)\s+[\w\s,=+\-*/\d.()\[\]]+;
		let variableNamePattern = /\w+/;
		// matches a pair of brackets with or without code inside it
		let arrayPattern = /\[[\w/*\-+]*\]*/g;
		// matches an '=' and the rest of the characters in a string
		let assignmentPattern = /=\s*[\w\W]*/;

		// Holds an array of matches from the pattern above
		// Due to how it's written it will only ever hold one value
		let match: RegExpExecArray | null;

		while ((match = dataTypePattern.exec(text)))
		{
			// remove the data type and semicolon from the matched text and then split on any commas
			let matchSet:string[] = match[0].replace(`${dataType}`, '').replace(';', '').split(',');

			// loop through each split to find the name.
			for(let m = 0; m < matchSet.length; ++m)
			{
				// remove any occurance of an array, then remove everything after the assignment operator.
				// This should be safe as we've split them into separate strings by now
				matchSet[m] = matchSet[m].replace(arrayPattern, '').replace(assignmentPattern, '');
				
				let nameMatches: RegExpExecArray | null = variableNamePattern.exec(matchSet[m]);
				if(nameMatches === null || nameMatches.length !== 1)
				{
					connection.client.connection.console.warn(`found null in match[${m}] '${match[0]}'`);
					continue;
				}

				// eyy now we have the variable name
				let variableName:string = nameMatches[0];

				// create a new variable with a classname of the original datatype
				let newVariable: Variable = new Variable(variableName, dataType, CompletionItemKind.Variable);

				// find the location of the name inside the orignal match.
				let indexof = match[0].indexOf(variableName);

				// create a position based of the original match location and and the name postion from within the match
				let variableStart: Position = textDocument.positionAt(match.index + indexof);
	
				// Create the end location based off of where we found the start position and offset it by the length of the define name
				let variableEnd: Position = Position.create(variableStart.line, variableStart.character + variableName.length);
	
				// now we make a range from the two positions
				let variableRange: Range = Range.create(variableStart, variableEnd);
	
				// and finally we link it to the document that it was found
				let variableLocation: LocationLink = LocationLink.create(textDocument.uri, variableRange, variableRange);

				// link it with the Variable object
				newVariable.declarationLocation = variableLocation;
				
				// add it to the list of definitions
				g_Variables.push(newVariable);
			}
		}
	}
}

function FindCustomVariables(textDocument: TextDocument, text: string): void
{

}

// returns a list of all the completion items and their methods and properties
export function GetVariables(): CompletionItem[]
{
	let returnValue: CompletionItem[] = [];
	g_Variables.forEach(
		function(value: Variable)
		{
			returnValue = returnValue.concat(value.toCompletionItems());
		}
	);
	return returnValue;
}