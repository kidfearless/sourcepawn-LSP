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

export var g_CommentLocations: LocationLink[] = [];

export function FindComments(textDocument: TextDocument)
{
	// clear the list for now until we handle multiple files
	g_CommentLocations = [];

	// get the text document as a single string
	let text:string = textDocument.getText();

	// honestly I got this from stack overflow, seemed pretty effective once the single line comment section was removed
	// https://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment#answer-51942711
	let blockCommentRegex:RegExp = /\/(?!\\)\*[\s\S]*?\*(?!\\)\//g;

	// Holds an array of matches from the pattern above
	// Due to how it's written it will only ever hold one value
	let match: RegExpExecArray | null;

	// this one is pretty easy compared to the rest, we don't need to do any other parsing just grab the start and end positions
	while ((match = blockCommentRegex.exec(text)))
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
		g_CommentLocations.push(location);
	}
	
	// ok, I might be over relying on regex for this, but it's so simple and convienent
	let singleLineCommentRegex:RegExp = /\/\/.*\n/g;
	// add the line comments to the list
	while ((match = blockCommentRegex.exec(text)))
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
		g_CommentLocations.push(location);
	}
}

// Tests whether the given locationlink is found within one of the cached comments
// Does not check if the given comment is inside a string
export function IsLocationLinkInComment(testLocation:LocationLink):boolean
{
	// Loop through each string location we have saved
	g_CommentLocations.forEach(
		function(commentLocation:LocationLink)
		{
			// Validate that they are the same document first
			if(commentLocation.targetUri === testLocation.targetUri)
			{
				// cast the language server range to a vscode range
				let commentRange: vscode.Range = new vscode.Range(
					commentLocation.targetRange.start.line,
					commentLocation.targetRange.start.character,
					commentLocation.targetRange.end.line,
					commentLocation.targetRange.end.character
				);
				let testRange: vscode.Range = new vscode.Range(
					testLocation.targetRange.start.line,
					testLocation.targetRange.start.character,
					testLocation.targetRange.end.line,
					testLocation.targetRange.end.character
				);

				// Check if the range we are testing is contained inside a string
				if(commentRange.contains(testRange))
				{
					return true;
				}
			}
		}
	);

	// wow we did all that work and found nothing, oh well guess that location is safe
	return false;
}