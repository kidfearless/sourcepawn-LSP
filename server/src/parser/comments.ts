import
{
	TextDocument,
	Range,
	Location,
	Position,
	LocationLink
} from 'vscode-languageserver';
// need the range.contains method for vscode

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
	for(let i = 0; i < g_CommentLocations.length; ++i)
	{
		let commentLocation = g_CommentLocations[i];

		// Validate that they are the same document first
		if(commentLocation.targetUri !== testLocation.targetUri)
		{
			continue;
		}
		// if the position's line starts before our comment's start line then we continue
		// if the position's line ends after our comment's end line then we continue
		if( testLocation.targetRange.start.line < commentLocation.targetRange.start.line ||
			testLocation.targetRange.end.line 	> commentLocation.targetRange.end.line )
		{
			continue;
		}
		// same check as before but with characters. The lines are the same, now we're checking if the characters are inside
		if( testLocation.targetRange.start.character < commentLocation.targetRange.start.character ||
			testLocation.targetRange.end.character   > commentLocation.targetRange.end.character )
		{
			continue;
		}

		// passed negative validation.
		// the test location is within the same document, both lines are within the target range, smae with the characters. so we must be inside a string.
		return true;
	}

	// wow we did all that work and found nothing, oh well guess that location is safe
	return false;
}