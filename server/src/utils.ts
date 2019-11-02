import
{
	LocationLink, CompletionParams, TextDocument, CompletionItem
} from 'vscode-languageserver';

export function LinkLocationToString(location: LocationLink): string
{
	let ret: string = `${location.targetUri} (${location.targetRange.start.line}:${location.targetRange.start.character} - ${location.targetRange.end.line}:${location.targetRange.end.character})`;
	return ret;
}

// https://github.com/rocky/solidity-language-server/blob/master/server/src-todo/services/completions.ts#L234-L253
export function IsStringTrigger(testString: string, lineText: string, wordEndCharacter: number): boolean
{
	return (wordEndCharacter >= testString.length && lineText.substr(wordEndCharacter - testString.length, testString.length) === testString);
}

export function IsDotTrigger(line: string, character: number): boolean|number
{
	for (let i: number = character; i >= 0; i--)
	{
		if (line[i] === " ")
		{
			return false;
		}
		if (line[i] === ".")
		{
			return i;
		}
	}
	return false;
}
