import
{
	TextDocument,
	Range,
	Location,
	Position,
	LocationLink
} from 'vscode-languageserver';
// need the range.contains method for vscode

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
// Does not check if the given comment is inside a string
export function IsLocationLinkInComment(testLocation:LocationLink):boolean
{
	// Loop through each string location we have saved
	for(let i = 0; i < g_StringLocations.length; ++i)
	{
		let stringLocation = g_StringLocations[i];

		// Validate that they are the same document first
		if(stringLocation.targetUri !== testLocation.targetUri)
		{
			continue;
		}
		// if the position's line starts before our string's start line then we continue
		// if the position's line ends after our string's end line then we continue
		if( testLocation.targetRange.start.line < stringLocation.targetRange.start.line ||
			testLocation.targetRange.end.line 	> stringLocation.targetRange.end.line )
		{
			continue;
		}
		// same check as before but with characters. The lines are the same, now we're checking if the characters are inside
		if( testLocation.targetRange.start.character < stringLocation.targetRange.start.character ||
			testLocation.targetRange.end.character   > stringLocation.targetRange.end.character )
		{
			continue;
		}

		// passed negative validation.
		// the test location is within the same document, both lines are within the target range, smae with the characters. so we must be inside a comment.
		return true;
	}

	// wow we did all that work and found nothing, oh well guess that location is safe
	return false;
}