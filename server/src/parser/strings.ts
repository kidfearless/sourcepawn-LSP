import
{
	TextDocument,
	Range,
	Location,
	Position,
	LocationLink
} from 'vscode-languageserver';
// need the range.contains method for vscode
import * as vscode from 'vscode';

export var g_StringLocations: LocationLink[] = [];

export function FindStrings(textDocument: TextDocument)
{
	// clear the list for now until we handle multiple files
	g_StringLocations = [];

	// get the text document as a single string
	let text:string = textDocument.getText();

	// matches a singles " then any number of characters that aren't " and finally "
	let stringRegex:RegExp = /"[^"]*"/g;

	// Holds an array of matches from the pattern above
	// Due to how it's written it will only ever hold one value
	let match: RegExpExecArray | null;

	while ((match = stringRegex.exec(text)))
	{
		// create a position from the character index of the file
		let stringStart: Position = textDocument.positionAt(match.index);

		// Create the end location based off of where we found the start position and offset it by the length of the string
		let stringEnd: Position = textDocument.positionAt(match.index + match[0].length);

		// now we make a range from the two positions
		let stringRange: Range = Range.create(stringStart, stringEnd);

		// We're using LocationLinks instead of ranges because this will be expanded to includes and we'll need to track where we found these files.
		let location = LocationLink.create(textDocument.uri, stringRange, stringRange);

		// add the location of the string to the list.
		g_StringLocations.push(location);
	}
}

// Tests whether the given locationlink is found within one of the cached strings
// Does not check if the given string is contained within a comment though
export function IsLocationLinkInString(testLocation:LocationLink):boolean
{
	// Loop through each string location we have saved
	g_StringLocations.forEach(
		function(stringLocation:LocationLink)
		{
			// Validate that they are the same document first
			if(stringLocation.targetUri === testLocation.targetUri)
			{
				// cast the language server range to a vscode range
				let stringRange: vscode.Range = new vscode.Range(
					stringLocation.targetRange.start.line,
					stringLocation.targetRange.start.character,
					stringLocation.targetRange.end.line,
					stringLocation.targetRange.end.character
				);
				let testRange: vscode.Range = new vscode.Range(
					testLocation.targetRange.start.line,
					testLocation.targetRange.start.character,
					testLocation.targetRange.end.line,
					testLocation.targetRange.end.character
				);

				// Check if the range we are testing is contained inside a string
				// What happens if one of the end position is outside the string???
				if(stringRange.contains(testRange))
				{
					return true;
				}
			}
		}
	);

	// wow we did all that work and found nothing, oh well guess that location is safe
	return false;
}