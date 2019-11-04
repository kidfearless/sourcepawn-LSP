import { LocationLink, TextDocument, Range } from 'vscode-languageserver';


export enum SPTokenKind
{
	Name,
	Symbol,
	Newline,
	Quote,
	SingleLineComment,
	MultilineComment,
	BracketOpen,
	BracketClose,
	Operator,
	PreProcessorLine,
	Comma,
	Semicolon,
	Invalid
}

export class SPToken
{
	Kind: SPTokenKind;
	Value: string;
	Location: LocationLink;

	constructor(loc: LocationLink, kind: SPTokenKind, value: string)
	{
		this.Location = loc;
		this.Kind = kind;
		this.Value = value;
	}
}

export function Tokenize(document: TextDocument): SPToken[]
{
	let token: SPToken[] = [];
	let bAllowLTOperator: boolean = true;
	let bAllowGTOperator: boolean = true;
	let source: string = document.getText();

	for (let index: number = 0; index < source.length; ++index)
	{
		let c: string = source[index];
		// #region Newline
		//just fetch \n. \r will be killed by the whitestrip but it's reintroduced in Environment.NewLine
		if (c === '\n')
		{
			//add them before the whitestrip-killer will get them ^^
			let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));
			token.push(new SPToken(loc, SPTokenKind.Newline, '\n'));
			continue;
		}
		// #endregion
		// #region Whitespace
		let bIsWhiteSpace = IsStringWhiteSpace(c);
		if (bIsWhiteSpace)
		{
			continue;
		}
		// #endregion
		// #region Quotes
		if (c === '"')
		{
			let startIndex: number = index;
			//these suckers are here because we want to continue the main-for-loop but cannot do it from the for-loop in the nextline
			let bFoundOccurrence: boolean = false;
			for (let stringPos: number = index + 1; stringPos < source.length; ++stringPos)
			{
				if (source[stringPos] === '"')
				{
					if (source[stringPos - 1] != '\\') //is the quote not escaped?
					{
						let range: Range = Range.create(document.positionAt(startIndex), document.positionAt(stringPos + 1));
						let loc: LocationLink = (LocationLink.create(document.uri, range, range));

						token.push(new SPToken(loc, SPTokenKind.Quote, source.substr(startIndex, stringPos - startIndex + 1)));
						bFoundOccurrence = true;
						index = stringPos; //skip it in the main loop
						break;
					}
				}
			}
			if (bFoundOccurrence !== true)
			{
				let range: Range = Range.create(document.positionAt(startIndex), document.positionAt(source.length));
				let loc: LocationLink = (LocationLink.create(document.uri, range, range));

				token.push(new SPToken(loc, SPTokenKind.Quote, source.substr(startIndex)));
				/* We are doing this, because the reformatter is often called while formating a single line.
					* When open quotes are there, we don't want them to be reformatted. So we tread them like
					* closed ones.
				*/
				index = source.length; //skip whole loop
			}
			continue;
		}
		if (c === '\'') //I sell that as a quote...kill me right?
		{
			let startIndex: number = index;
			let bFoundOccurrence: boolean = false;
			for (let charPos: number = index + 1; charPos < source.length; ++charPos)
			{
				if (source[charPos] === '\'')
				{
					if (source[charPos - 1] != '\\') //is the quote not escaped?
					{
						let range: Range = Range.create(document.positionAt(startIndex), document.positionAt(charPos + 1));
						let loc: LocationLink = (LocationLink.create(document.uri, range, range));

						token.push(new SPToken(loc, SPTokenKind.Quote, source.substr(startIndex, charPos - startIndex + 1)));
						bFoundOccurrence = true;
						index = charPos;
						break;
					}
				}
			}
			if (bFoundOccurrence === true)
			{
				continue;
			}
		}
		// #endregion
		//#region comments
		if (c === '/') //lets find comments...
		{
			if ((index + 1) < source.length) //is a next char even possible? Because both have at least one next char.
			{
				if (source[index + 1] === '/') //I see you singlelinecomment ^^
				{
					let startIndex: number = index;
					let endIndex: number = index; // this is here, because if we reach the end of the document, this is still a comment
					//so when we fall out of the for-loop without lineending match, we'll just use this as the endoffset.
					++index;
					for (let commentEnd: number = index + 1; commentEnd < source.length; ++commentEnd)
					{
						if (source[commentEnd] === '\r' || source[commentEnd] === '\n') //different line ending specifications...horribly...
						{
							break;
						}
						endIndex = commentEnd;
					}
					index = endIndex;

					let range: Range = Range.create(document.positionAt(startIndex), document.positionAt(endIndex + 1));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));

					token.push(new SPToken(loc, SPTokenKind.SingleLineComment, source.substr(startIndex, endIndex - startIndex + 1)));
					continue;
				}
				else if ((index + 3) < source.length) //this have to be true because of the closing phrase '*/'
				{
					if (source[index + 1] === '*') //aaaaaand, multilinecomment...
					{
						let startIndex: number = index;
						++index;
						let bFoundOccurrence: boolean = false;
						for (let endIndex: number = index + 1; endIndex < source.length; ++endIndex)
						{
							if (source[endIndex] === '/' && source[endIndex - 1] === '*')
							{
								index = endIndex;
								bFoundOccurrence = true;

								let range: Range = Range.create(document.positionAt(startIndex), document.positionAt(endIndex + 1));
								let loc: LocationLink = (LocationLink.create(document.uri, range, range));

								token.push(new SPToken(loc, SPTokenKind.MultilineComment, source.substr(startIndex, endIndex - startIndex + 1)));
								break;
							}
						}
						if (bFoundOccurrence === true)
						{
							continue;
						}
					}
				}
			}
		}
		//#endregion
		// #region Names
		if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_')
		{
			let startIndex: number = index;
			let endindex: number = index;
			for (let j: number = index + 1; j < source.length; ++j)
			{
				c = source[j];
				if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_'))
				{
					break;
				}
				endindex = j;
			}
			index = endindex;
			let strValue: string = source.substr(startIndex, endindex - startIndex + 1);
			if (strValue === "view_as")
			{
				bAllowGTOperator = bAllowLTOperator = false;
			}

			let range: Range = Range.create(document.positionAt(startIndex), document.positionAt(endindex + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));
			token.push(new SPToken(loc, SPTokenKind.Name, strValue));
			continue;
		}
		// #endregion
		// #region Brackets
		if (c === '{')
		{
			let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));
			token.push(new SPToken(loc, SPTokenKind.BracketOpen, "{"));
			continue;
		}
		if (c === '}')
		{
			let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));
			token.push(new SPToken(loc, SPTokenKind.BracketClose, "}"));
			continue;
		}
		// #endregion
		// #region Operators
		if (c === '=')
		{
			if ((index + 1) < source.length)
			{
				if (source[index + 1] === '=')
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 2));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));

					token.push(new SPToken(loc, SPTokenKind.Operator, "=="));
					index++;
					continue;
				}
			}
			let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));

			token.push(new SPToken(loc, SPTokenKind.Operator, "="));
			continue;
		}
		if (c === '?' || c === '%')
		{
			let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));

			token.push(new SPToken(loc, SPTokenKind.Operator, c));
			continue;
		}
		if (c === ':')
		{
			if (index > 0)
			{
				if (source[index - 1] === ' ' || source[index - 1] === '\t')
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));
					token.push(new SPToken(loc, SPTokenKind.Operator, ":"));
					continue;
				}
			}
		}
		if (c === '<' || c === '>' || c === '!' || c === '|' || c === '&' || c === '+' || c === '-' || c === '*' || c === '/' || c === '^')
		{
			if ((index + 1) < source.length)
			{
				if (source[index + 1] === '=')
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 2));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));
					token.push(new SPToken(loc, SPTokenKind.Operator, source.substr(index, 2)));
					index++;
					continue;
				}
			}
			if (c != '!' && c != '|' && c != '&' && c != '+' && c != '-' && c != '<' && c != '>') //they can have another meaning so they are handled on their own
			{
				let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
				let loc: LocationLink = (LocationLink.create(document.uri, range, range));
				token.push(new SPToken(loc, SPTokenKind.Operator, source.substr(index, 1)));
				continue;
			}
		}
		if (c === '|')
		{
			if ((index + 1) < source.length)
			{
				if (source[index + 1] === '|')
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 2));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));
					token.push(new SPToken(loc, SPTokenKind.Operator, "||"));
					++index;
					continue;
				}
			}
			let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));
			token.push(new SPToken(loc, SPTokenKind.Operator, "|"));
			continue;
		}
		if (c === '>')
		{
			if ((index + 1) < source.length)
			{
				if (source[index + 1] === '>')
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 2));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));
					token.push(new SPToken(loc, SPTokenKind.Operator, ">>"));
					++index;
					continue;
				}
			}
			if (bAllowGTOperator === true)
			{
				let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
				let loc: LocationLink = (LocationLink.create(document.uri, range, range));
				token.push(new SPToken(loc, SPTokenKind.Operator, ">"));
				continue;
			}
			else
			{
				bAllowGTOperator = true;
			}
		}
		if (c === '<')
		{
			if ((index + 1) < source.length)
			{
				if (source[index + 1] === '<')
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 2));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));
					token.push(new SPToken(loc, SPTokenKind.Operator, "<<"));
					++index;
					continue;
				}
			}
			if (bAllowLTOperator === true)
			{
				let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
				let loc: LocationLink = (LocationLink.create(document.uri, range, range));
				token.push(new SPToken(loc, SPTokenKind.Operator, "<"));
				continue;
			}
			else
			{
				bAllowLTOperator = true;
			}
		}
		if (c === '&') //the & operator is a little bit problematic. It can mean bitwise AND or address of variable. This is not easy to determinate
		{
			let bCanMatchSingle: boolean = true;
			if ((index + 1) < source.length)
			{
				if (source[index + 1] === '&')
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 2));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));
					token.push(new SPToken(loc, SPTokenKind.Operator, "&&"));
					++index;
					continue;
				}
				//if next to the single & is a function valid char, prepend its the addressof-operator | this can be lead to formatting-errors, but hey, thats not my fault..
				if (((source[index + 1] >= 'a' && source[index + 1] <= 'z') || source[index + 1] >= 'A' && source[index + 1] <= 'Z') || source[index + 1] === '_')
				{
					bCanMatchSingle = false;
				}
			}
			if (bCanMatchSingle === true)
			{
				let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
				let loc: LocationLink = (LocationLink.create(document.uri, range, range));
				token.push(new SPToken(loc, SPTokenKind.Operator, "&"));
				continue;
			}
		}
		if (c === '+')
		{
			let bIsMatched: boolean = true;
			if ((index + 1) < source.length)
			{
				bIsMatched = source[index + 1] != '+';
			}
			if (bIsMatched === true)
			{
				if ((index - 1) < source.length && (index - 1) >= 0)
				{
					bIsMatched = source[index - 1] != '+';
				}
				if (bIsMatched === true)
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));
					token.push(new SPToken(loc, SPTokenKind.Operator, "+"));
					continue;
				}
			}
		}
		if (c === '-')
		{
			let bIsMatched: boolean = true;
			if ((index + 1) < source.length)
			{
				bIsMatched = source[index + 1] != '-';
			}
			if (bIsMatched === true)
			{
				if ((index - 1) < source.length && (index - 1) >= 0)
				{
					bIsMatched = source[index - 1] != '-';
				}
				if (bIsMatched === true)
				{
					let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
					let loc: LocationLink = (LocationLink.create(document.uri, range, range));
					token.push(new SPToken(loc, SPTokenKind.Operator, "-"));
					continue;
				}
			}
		}
		// #endregion
		// #region PreProcessorLine
		if (c === '#') //lets just overtake Lines of Preprocessing-directives
		{
			let startIndex: number = index;
			let endIndex: number = index;
			for (let j: number = index + 1; j < source.length; ++j)
			{
				if (source[j] === '\r' || source[j] === '\n')
				{
					break;
				}
				endIndex = j;
			}
			index = endIndex;
			let range: Range = Range.create(document.positionAt(startIndex), document.positionAt(endIndex + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));
			token.push(new SPToken(loc, SPTokenKind.PreProcessorLine, source.substr(startIndex, endIndex - startIndex + 1)));
			continue;
		}
		// #endregion
		// #region Symbols
		if (c === ',')
		{
			let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));
			token.push(new SPToken(loc, SPTokenKind.Comma, ","));
			continue;
		}
		if (c === ';')
		{
			let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
			let loc: LocationLink = (LocationLink.create(document.uri, range, range));
			token.push(new SPToken(loc, SPTokenKind.Semicolon, ";"));
			continue;
		}
		let range: Range = Range.create(document.positionAt(index), document.positionAt(index + 1));
		let loc: LocationLink = (LocationLink.create(document.uri, range, range));
		token.push(new SPToken(loc, SPTokenKind.Symbol, c));
		// #endregion
	}

	return token;
}


function IsStringWhiteSpace(input: string): boolean
{
	const whitespaceRegex: RegExp = /[\s\xA0\uFEFF]/;
	return whitespaceRegex.test(input);
}