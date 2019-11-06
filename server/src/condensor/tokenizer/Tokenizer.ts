import {TokenKind} from './TokenKind';
import {Token} from './Token';


export function TokenizeString(Source:string, IgnoreMultipleEOL:boolean): Token[]
{
	let sArray:string[] = Array.from(Source);
	let sArrayLength:number = sArray.length;
	let token: Token[] = [];
	//the reservation of the capacity is an empirical measured optimization. The average token to text length is 0.19 (with multiple EOL)
	//To hopefully never extend the inner array, we use 2.3  |  performance gain: around 20%
	let c = '';
	for (let i = 0; i < sArrayLength; ++i)
	{
		c = sArray[i];

		// #region Whitespace
		if (c == ' ' || c == '\t')
		{
			continue;
		}

		if (c == '\n' || c == '\r')
		{
			token.push(new Token("\r\n", TokenKind.EOL, i));
			if (IgnoreMultipleEOL)
			{
				while ((i + 1) < sArrayLength)
				{
					if (sArray[i + 1] == '\n' || sArray[i + 1] == '\r')
					{
						++i;
					}
					else
					{
						break;
					}
				}
			}
			else if (c == '\r')
			{
				if ((i + 1) < sArrayLength)
				{
					if (sArray[i + 1] == '\n')
					{
						++i;
					}
				}
			}
			continue;
		}
		// #endregion

		// #region Special characters
		if (c == '{')
		{
			token.push(new Token("{", TokenKind.BraceOpen, i));
			continue;
		}

		if (c == '}')
		{
			token.push(new Token("}", TokenKind.BraceClose, i));
			continue;
		}

		if (c == '(')
		{
			token.push(new Token("(", TokenKind.ParenthesisOpen, i));
			continue;
		}

		if (c == ')')
		{
			token.push(new Token(")", TokenKind.ParenthesisClose, i));
			continue;
		}

		if (c == ';')
		{
			token.push(new Token(";", TokenKind.Semicolon, i));
			continue;
		}

		if (c == ',')
		{
			token.push(new Token(",", TokenKind.Comma, i));
			continue;
		}

		if (c == '=')
		{
			token.push(new Token("=", TokenKind.Assignment, i));
			continue;
		}
		// #endregion

		// #region Comments
		if (c== '/')
		{
			if ((i + 1) < sArrayLength)
			{
				if (sArray[i + 1] == '/') //singleline comment
				{
					let startIndex = i;
					let endIndex = -1;
					for (let j = i + 1; j < sArrayLength; ++j)
					{
						if (sArray[j] == '\r' || sArray[j] == '\n')
						{
							endIndex = j;
							break;
						}
					}
					if (endIndex == -1)
					{
						token.push(new Token(Source.substr(startIndex), TokenKind.SingleLineComment, startIndex));
						i = sArrayLength;
					}
					else
					{
						token.push(new Token(Source.substr(startIndex, endIndex - startIndex), TokenKind.SingleLineComment, startIndex));
						i = endIndex - 1;
					}
					continue;
				}
				else if (sArray[i + 1] == '*') //multiline comment
				{
					if ((i + 3) < sArrayLength)
					{
						let startIndex = i;
						let endIndex = -1;
						for (let j = i + 3; j < sArrayLength; ++j)
						{
							if (sArray[j] == '/')
							{
								if (sArray[j - 1] == '*')
								{
									endIndex = j;
									break;
								}
							}
						}
						if (endIndex == -1)
						{
							i = sArrayLength;
							token.push(new Token(Source.substr(startIndex), TokenKind.MultiLineComment, startIndex));
						}
						else
						{
							i = endIndex;
							token.push(new Token(Source.substr(startIndex, endIndex - startIndex + 1), TokenKind.MultiLineComment, startIndex));
						}
						continue;
					}
				}
			}
		}
		// #endregion

		// #region Quotes
		if (c == '"' && ((i + 1) < sArrayLength))
		{
			let startIndex = i;
			let endIndex = -1;
			for (let j = i + 1; j < sArrayLength; ++j)
			{
				if (sArray[j] == '"')
				{
					if (sArray[j - 1] != '\\')
					{
						endIndex = j;
						break;
					}
				}
			}
			if (endIndex != -1)
			{
				token.push(new Token(Source.substr(startIndex, endIndex - startIndex + 1), TokenKind.Quote, startIndex));
				i = endIndex;
				continue;
			}
		}
		// #endregion

		// #region Identifier
		if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_') //identifier
		{
			let startIndex = i, endIndex = i + 1;
			let nextChar:string = '\0';
			if ((i + 1) < sArrayLength)
			{
				nextChar = sArray[i + 1];
				endIndex = -1;
				for (let j = i + 1; j < sArrayLength; ++j)
				{
					if (!((sArray[j] >= 'a' && sArray[j] <= 'z') || (sArray[j] >= 'A' && sArray[j] <= 'Z') || (sArray[j] >= '0' && sArray[j] <= '9') || sArray[j] == '_'))
					{
						endIndex = j;
						break;
					}
				}
				if (endIndex == -1)
				{ endIndex = sArrayLength; }
			}
			if ((c != '_') || (c == '_' && ((nextChar >= 'a' && nextChar <= 'z') || (nextChar >= 'A' && nextChar <= 'Z') || (nextChar >= '0' && nextChar <= '9') || nextChar == '_')))
			{
				let identString:string = Source.substr(startIndex, endIndex - startIndex);
				switch (identString)
				{
					case "native":
					case "stock":
					case "forward":
					case "public":
					case "normal":
					case "static":
						{
							token.push(new Token(identString, TokenKind.FunctionIndicator, startIndex));
							break;
						}
					case "enum":
						{
							token.push(new Token(identString, TokenKind.Enum, startIndex));
							break;
						}
					case "struct":
						{
							token.push(new Token(identString, TokenKind.Struct, startIndex));
							break;
						}
					case "const":
						{
							token.push(new Token(identString, TokenKind.Constant, startIndex));
							break;
						}
					case "methodmap":
						{
							token.push(new Token(identString, TokenKind.MethodMap, startIndex));
							break;
						}
					case "property":
						{
							token.push(new Token(identString, TokenKind.Property, startIndex));
							break;
						}
					case "typeset":
					case "funcenum":
						{
							token.push(new Token(identString, TokenKind.TypeSet, startIndex));
							break;
						}
					case "typedef":
					case "functag":
						{
							token.push(new Token(identString, TokenKind.TypeDef, startIndex));
							break;
						}
					default:
						{
							token.push(new Token(identString, TokenKind.Identifier, startIndex));
							break;
						}
				}
				i = endIndex - 1;
				continue;
			}
		}
		// #endregion

		// #region Numbers
		if (c >= '0' && c <= '9') //numbers
		{
			let startIndex = i;
			let endIndex = -1;
			let gotDecimal:boolean = false;
			let gotExponent:boolean = false;
			for (let j = i + 1; j < sArrayLength; ++j)
			{
				if (sArray[j] == '.')
				{
					if (!gotDecimal)
					{
						if ((j + 1) < sArrayLength)
						{
							if (sArray[j + 1] >= '0' && sArray[j + 1] <= '9')
							{
								gotDecimal = true;
								continue;
							}
						}
					}
					endIndex = j - 1;
					break;
				}
				if (sArray[j] == 'e' || sArray[j] == 'E')
				{
					if (!gotExponent)
					{
						if ((j + 1) < sArrayLength)
						{
							if (sArray[j + 1] == '+' || sArray[j + 1] == '-')
							{
								if ((j + 2) < sArrayLength)
								{
									if (sArray[j + 2] >= '0' && sArray[j + 2] <= '9')
									{
										++j;
										gotDecimal = gotExponent = true;
										continue;
									}
								}
							}
							else if (sArray[j + 1] >= '0' && sArray[j + 1] <= '9')
							{
								gotDecimal = gotExponent = true;
								continue;
							}
						}
					}
					endIndex = j - 1;
					break;
				}

				if (!(sArray[j] >= '0' && sArray[j] <= '9'))
				{
					endIndex = j - 1;
					break;
				}
			}
			if (endIndex == -1)
			{ endIndex = sArrayLength - 1; }
			token.push(new Token(Source.substr(startIndex, endIndex - startIndex + 1), TokenKind.Number, startIndex));
			i = endIndex;
			continue;
		}
		// #endregion

		// #region Preprocessor Directives
		if (c == '#')
		{
			let startIndex = i;
			if ((i + 1) < sArrayLength)
			{
				let testChar:string = sArray[i + 1];
				if ((testChar >= 'a' && testChar <= 'z') || (testChar >= 'A' && testChar <= 'Z'))
				{
					let endIndex = i + 1;
					for (let j = i + 1; j < sArrayLength; ++j)
					{
						if (!((sArray[j] >= 'a' && sArray[j] <= 'z') || (sArray[j] >= 'A' && sArray[j] <= 'Z')))
						{
							endIndex = j;
							break;
						}
					}
					let directiveString:string = Source.substr(startIndex, endIndex - startIndex);
					token.push(new Token(directiveString, TokenKind.PrePocessorDirective, startIndex));
					i = endIndex - 1;
					continue;
				}
			}
		}
		// #endregion


		token.push(new Token(c, TokenKind.Character, i));
	}
	token.push(new Token("", TokenKind.EOF, sArrayLength));
	return token;
}