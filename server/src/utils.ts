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

export function FindClosingBrace(source: string, startPoint:number): number
{
	let endPoint = startPoint;
	let braceCount = 1;
	for (; endPoint < source.length; ++endPoint)
	{
		if (source[endPoint] === '{')
		{
			++braceCount;
		}
		else if (source[endPoint] === '}')
		{
			--braceCount;
		}
		if (braceCount == 0)
		{
			return endPoint;
		}
	}
	return endPoint;
}

export function IsStringNullOrWhitespace(source:string|null):boolean
{
	return !(source !== null && source.length > 0 && source[0].match(/\s/) !== null);
}

export function TrimStart(source: string, characters:string[]):string
{
	let ret = source.slice(0);

	let test = false;
	do
	{
		test = false;
		for(let i = 0; i < characters.length; ++i)
		{
			if(ret[0] === characters[i][0])
			{
				ret = ret.slice(1);
				test = true;
			}
		}
	} while(test);


	return ret;
}
