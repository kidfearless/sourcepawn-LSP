import { SMDefinition } from './definitions/definition';
import * as Tokenizer from './tokenizer/Tokenizer';
import { SMFunctionKind } from './definitions/SMFunction';
import { SMTypedef } from './definitions/SMTypedef';
import { SMStruct } from './definitions/SMStruct';
import { IsStringNullOrWhitespace, TrimStart } from '../utils';
import { StringBuilder } from '../classes';
import { SMMethodmapField, SMMethodmap, SMMethodmapMethod } from './definitions/SMMethodmap';
export enum TokenKind
{
	Identifier,				//done
	Number,					//d
	Character,				//d
	BraceOpen,				//d
	BraceClose,				//d
	ParenthesisOpen,		//d
	ParenthesisClose,		//d
	Quote,					//d
	SingleLineComment,		//d
	MultiLineComment,		//d
	Semicolon,				//d
	Comma,					//d
	Assignment,				//d

	FunctionIndicator,		//d
	Constant,				//d
	Enum,					//d
	Struct,					//d
	MethodMap,				//d
	Property,				//d
	PrePocessorDirective,	//d
	TypeDef,				//d
	TypeSet,				//d

	EOL,					//d
	EOF,					//d
}

export class Token
{
	Value: string;
	Kind: TokenKind;
	Index: number;
	Length: number;

	constructor(value: string, kind: TokenKind, index: number)
	{
		this.Value = value;
		this.Kind = kind;
		this.Index = index;
		this.Length = value.length;
	}
}

export class Condenser
{
	t:Token[];
	position:number;
	length:number;
	def:SMDefinition;
	source:string;
	
	FileName:string = '';

	constructor(sourceCode:string, fileName:string)
	{
		this.t = Tokenizer.TokenizeString(sourceCode, true);
		this.position = 0;
		this.length = this.t.length;
		this.def = new SMDefinition();
		this.source = sourceCode;
		if (fileName.endsWith(".inc"))
		{
			fileName = fileName.substr(0, fileName.length - 4);
		}
		this.FileName = fileName;
	}

	Condense():SMDefinition
	{
		let ct:Token;
		while ((ct = this.t[this.position]).Kind != TokenKind.EOF)
		{
			if (ct.Kind == TokenKind.FunctionIndicator)
			{
				let newIndex = this.ConsumeSMFunction();
				if (newIndex != -1)
				{
					this.position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.Enum)
			{
				let newIndex:number = this.ConsumeSMEnum();
				if (newIndex != -1)
				{
					this.position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.Struct)
			{
				let newIndex:number = this.ConsumeSMStruct();
				if (newIndex != -1)
				{
					this.position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.PrePocessorDirective)
			{
				let newIndex:number = this.ConsumeSMPPDirective();
				if (newIndex != -1)
				{
					this.position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.Constant)
			{
				let newIndex:number = this.ConsumeSMConstant();
				if (newIndex != -1)
				{
					this.position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.MethodMap)
			{
				let newIndex:number = this.ConsumeSMMethodmap();
				if (newIndex != -1)
				{
					this.position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.TypeSet)
			{
				let newIndex:number = this.ConsumeSMTypeset();
				if (newIndex != -1)
				{
					this.position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.TypeDef)
			{
				let newIndex:number = this.ConsumeSMTypedef();
				if (newIndex != -1)
				{
					this.position = newIndex + 1;
					continue;
				}
			}

			++this.position;
		}
		this.def.Sort();
		return this.def;
	}

	BacktraceTestForToken( StartPosition: number, TestKind:TokenKind, IgnoreEOL:boolean, IgnoreOtherTokens: boolean):number
	{
		for (let i = StartPosition; i >= 0; --i)
		{
			if (this.t[i].Kind == TestKind)
			{
				return i;
			}
			else if (IgnoreOtherTokens)
			{
				continue;
			}
			else if (this.t[i].Kind == TokenKind.EOL && IgnoreEOL)
			{
				continue;
			}
			return -1;
		}
		return -1;
	}
	FortraceTestForToken( StartPosition: number, TestKind:TokenKind, IgnoreEOL:boolean, IgnoreOtherTokens: boolean):number
	{
		for (let i = StartPosition; i < length; ++i)
		{
			if (this.t[i].Kind == TestKind)
			{
				return i;
			}
			else if (IgnoreOtherTokens)
			{
				continue;
			}
			else if (this.t[i].Kind == TokenKind.EOL && IgnoreEOL)
			{
				continue;
			}
			return -1;
		}
		return -1;
	}

	static TrimComments(comment: string): string
	{
		let outString = new StringBuilder();
		let lines:string[] = comment.split(/\r|\n/);
		let line:string = '';
		for (let i = 0; i < lines.length; ++i)
		{
			line = (lines[i].trim());
			line = TrimStart(line, ['/', '*', ' ', '\t']);
			if (!IsStringNullOrWhitespace(line))
			{
				if (i > 0)
				{
					outString.AppendLine();
				}
				if (line.startsWith("@param"))
				{
					outString.Append(this.FormatParamLineString(line));
				}
				else
				{
					outString.Append(line);
				}
			}
		}
		return outString.toString().trim();
	}
	TrimFullname( name:string):string
	{
		let toString = new StringBuilder();
		let lines:string[] = name.split('\n');
		for (let i:number = 0; i < lines.length; ++i)
		{
			if (!IsStringNullOrWhitespace(lines[i]))
			{
				if (i > 0)
				{
					toString.Append(" ");
				}
				toString.Append(lines[i].trim());
			}
		}
		return toString.ToString();
	}

	static FormatParamLineString(line:string):string
	{
		let split:string[] = line.replace('\t', ' ').split(' ', 3);
		if (split.length > 2)
		{
			let ret = "@param " + split[1];
			while(ret.length < 24)
			{
				ret += ' ';
			}
			return (ret + " " + split[2].trim());
		}
		return line;
	}
	//#region SMTypedefConsumer
	ConsumeSMTypedef():number
	{
		let startIndex:number = this.t[this.position].Index;
		if ((this.position + 2) < length)
		{
			++this.position;
			let name:string = "";
			if (this.t[this.position].Kind == TokenKind.Identifier)
			{
				name = this.t[this.position].Value;
				for (let iteratePosition = this.position + 1; iteratePosition < length; ++iteratePosition)
				{
					if (this.t[iteratePosition].Kind == TokenKind.Semicolon)
					{
						let push:SMTypedef =
						{
							Index: startIndex,
							Length: this.t[iteratePosition].Index - startIndex + 1,
							File: this.FileName,
							Name: name,
							FullName: this.source.substr(startIndex, this.t[iteratePosition].Index - startIndex + 1)
						};
						this.def.Typedefs.push(push);
						return iteratePosition;
					}
				}
			}
		}
		return -1;
	}

	ConsumeSMTypeset(): number
	{
		let startIndex:number = this.t[this.position].Index;
		if ((this.position + 2) < length)
		{
			++this.position;
			let name:string = "";
			if (this.t[this.position].Kind == TokenKind.Identifier)
			{
				name = this.t[this.position].Value;
				let bracketIndex = 0;
				for (let iteratePosition = this.position + 1; iteratePosition < length; ++iteratePosition)
				{
					if (this.t[iteratePosition].Kind == TokenKind.BraceClose)
					{
						--bracketIndex;
						if (bracketIndex == 0)
						{
							let push:SMTypedef =
							{
								Index: startIndex,
								Length: this.t[iteratePosition].Index - startIndex + 1,
								File: this.FileName,
								Name: name,
								FullName: this.source.substr(startIndex, this.t[iteratePosition].Index - startIndex + 1)
							};
							this.def.Typedefs.push();

							return iteratePosition;
						}
					}
					else if (this.t[iteratePosition].Kind == TokenKind.BraceOpen)
					{
						++bracketIndex;
					}
				}
			}
		}
		return -1;
	}
	// #endregion
	// #region SMStructConsumer
	ConsumeSMStruct():number
	{
		let startIndex:number = this.t[this.position].Index;
		if ((this.position + 1) < length)
		{
			let iteratePosition = this.position;
			let structName:string = "";
			while ((iteratePosition + 1) < length && this.t[iteratePosition].Kind != TokenKind.BraceOpen)
			{
				if (this.t[iteratePosition].Kind == TokenKind.Identifier)
				{
					structName = this.t[iteratePosition].Value;
				}
				++iteratePosition;
			}
			let braceState = 0;
			let endTokenIndex = -1;
			for (; iteratePosition < length; ++iteratePosition)
			{
				if (this.t[iteratePosition].Kind == TokenKind.BraceOpen)
				{
					++braceState;
					continue;
				}
				if (this.t[iteratePosition].Kind == TokenKind.BraceClose)
				{
					--braceState;
					if (braceState == 0)
					{
						endTokenIndex = iteratePosition;
						break;
					}
					continue;
				}
			}
			if (endTokenIndex == -1)
			{
				return -1;
			}
			this.def.Structs.push(
				{
					Index: startIndex,
					Length: (this.t[endTokenIndex].Index - startIndex) + 1,
					File: this.FileName,
					Name: structName
				}
			);
			return endTokenIndex;
		}
		return -1;
	}
	// #region SMPPDirectiveConsumer
	ConsumeSMPPDirective():number
	{
		if (this.t[this.position].Value == "#define")
		{
			if ((this.position + 1) < length)
			{
				if (this.t[this.position + 1].Kind == TokenKind.Identifier)
				{
					this.def.Defines.push(
						{
							Index: this.t[this.position].Index,
							Length: (this.t[this.position + 1].Index - this.t[this.position].Index) + this.t[this.position + 1].Length,
							File: this.FileName,
							Name: this.t[this.position + 1].Value
						}
					);
					for (let j = this.position + 1; j < length; ++j)
					{
						if (this.t[j].Kind == TokenKind.EOL)
						{
							return j;
						}
					}
					return this.position + 1;
				}
			}
		}
		return -1;
	}

	// #endregion
	// #region SMMethodmapConsumer
	ConsumeSMMethodmap():number
	{
		let startIndex:number = this.t[this.position].Index;
		let iteratePosition = this.position + 1;
		if ((this.position + 4) < length)
		{
			let methodMapName:string = "";
			let methodMapType:string = "";
			let methods:SMMethodmapMethod[] = [];
			let fields:SMMethodmapField[] = [];
			if (this.t[iteratePosition].Kind == TokenKind.Identifier)
			{
				if (this.t[iteratePosition + 1].Kind == TokenKind.Identifier)
				{
					methodMapType = this.t[iteratePosition].Value;
					++iteratePosition;
					methodMapName = this.t[iteratePosition].Value;
				}
				else
				{
					methodMapName = this.t[iteratePosition].Value;
				}
				++iteratePosition;
			}
			let inheriteType:string = "";
			let enteredBlock:boolean = false;
			let braceIndex = 0;
			let lastIndex = -1;
			for (; iteratePosition < length; ++iteratePosition)
			{
				if (this.t[iteratePosition].Kind == TokenKind.BraceOpen)
				{
					++braceIndex;
					enteredBlock = true;
					continue;
				}
				else if (this.t[iteratePosition].Kind == TokenKind.BraceClose)
				{
					--braceIndex;
					if (braceIndex <= 0)
					{
						lastIndex = iteratePosition;
						break;
					}
				}
				else if (braceIndex == 0 && this.t[iteratePosition].Kind == TokenKind.Character)
				{
					if (this.t[iteratePosition].Value == "<")
					{
						if ((iteratePosition + 1) < length)
						{
							if (this.t[iteratePosition + 1].Kind == TokenKind.Identifier)
							{
								inheriteType = this.t[iteratePosition + 1].Value;
								++iteratePosition;
								continue;
							}
						}
					}
				}
				else if (enteredBlock)
				{
					if (this.t[iteratePosition].Kind == TokenKind.FunctionIndicator)
					{
						let mStartIndex = this.t[iteratePosition].Index;
						let functionCommentString:string = "";
						let commentTokenIndex = this.BacktraceTestForToken(iteratePosition - 1, TokenKind.MultiLineComment, true, false);
						if (commentTokenIndex == -1)
						{
							commentTokenIndex = this.BacktraceTestForToken(iteratePosition - 1, TokenKind.SingleLineComment, true, false);
							if (commentTokenIndex != -1)
							{
								let strBuilder = new StringBuilder(this.t[commentTokenIndex].Value);
								while ((commentTokenIndex = this.BacktraceTestForToken(commentTokenIndex - 1, TokenKind.SingleLineComment, true, false)) != -1)
								{
									strBuilder.Insert('\n');
									strBuilder.Insert(this.t[commentTokenIndex].Value);
								}
								functionCommentString = strBuilder.ToString();
							}
						}
						else
						{
							functionCommentString = this.t[commentTokenIndex].Value;
						}
						let mEndIndex = mStartIndex;
						let functionIndicators:string[] = [];
						let parameters:string[] = [];
						let methodName:string = "";
						let methodReturnValue:string = "";
						let ParsingIndicators:boolean = true;
						let InCodeSection:boolean = false;
						let ParenthesisIndex = 0;
						let mBraceIndex = 0;
						let AwaitingName:boolean = true;
						let lastFoundParam:string = "";
						let foundCurentParameter:boolean = false;
						let InSearchForComma:boolean = false;
						for (let i = iteratePosition; i < length; ++i)
						{
							if (InCodeSection)
							{
								if (this.t[i].Kind == TokenKind.BraceOpen)
								{
									++mBraceIndex;
								}
								else if (this.t[i].Kind == TokenKind.BraceClose)
								{
									--mBraceIndex;
									if (mBraceIndex <= 0)
									{
										iteratePosition = i;
										break;
									}
								}
							}
							else
							{
								if (ParsingIndicators)
								{
									if (this.t[i].Kind == TokenKind.FunctionIndicator)
									{
										functionIndicators.push(this.t[i].Value);
										continue;
									}
									else
									{
										ParsingIndicators = false;
									}
								}
								if (this.t[i].Kind == TokenKind.Identifier && AwaitingName)
								{
									if ((i + 1) < length)
									{
										if (this.t[i + 1].Kind == TokenKind.Identifier)
										{
											methodReturnValue = this.t[i].Value;
											methodName = this.t[i + 1].Value;
											++i;
										}
										else
										{
											methodName = this.t[i].Value;
										}
										AwaitingName = false;
									}
									continue;
								}
								if (this.t[i].Kind == TokenKind.ParenthesisOpen)
								{
									++ParenthesisIndex;
									continue;
								}
								if (this.t[i].Kind == TokenKind.ParenthesisClose)
								{
									--ParenthesisIndex;
									if (ParenthesisIndex == 0)
									{
										if (foundCurentParameter)
										{
											parameters.push(lastFoundParam);
											lastFoundParam = "";
										}
										InCodeSection = true;
										if ((i + 1) < length)
										{
											if (this.t[i + 1].Kind == TokenKind.Semicolon)
											{
												iteratePosition = i + 1;
												mEndIndex = this.t[i + 1].Index;
												break;
											}
											iteratePosition = i;
											mEndIndex = this.t[i].Index;
										}
									}
									continue;
								}
								if ((this.t[i].Kind == TokenKind.Identifier) && (!InSearchForComma))
								{
									lastFoundParam = this.t[i].Value;
									foundCurentParameter = true;
									continue;
								}
								if (this.t[i].Kind == TokenKind.Comma)
								{
									parameters.push(lastFoundParam);
									lastFoundParam = "";
									InSearchForComma = false;
								}
								else if (this.t[i].Kind == TokenKind.Assignment)
								{
									InSearchForComma = true;
								}
							}
						}
						if (mStartIndex < mEndIndex)
						{
							methods.push(
								{
									Index: mStartIndex,
									Name: methodName,
									ReturnType: methodReturnValue,
									MethodKind: Array.from(functionIndicators),
									Parameters: Array.from(parameters),
									FullName: this.TrimFullname(this.source.substr(mStartIndex, (mEndIndex - mStartIndex) + 1)),
									Length: (mEndIndex - mStartIndex) +1,
									CommentString: Condenser.TrimComments(functionCommentString),
									MethodmapName: methodMapName,
									File: this.FileName
								}
							);
						}
					}
					else if (this.t[iteratePosition].Kind == TokenKind.Property)
					{
						let fStartIndex = this.t[iteratePosition].Index;
						let fEndIndex = fStartIndex;
						if ((iteratePosition - 1) >= 0)
						{
							if (this.t[iteratePosition - 1].Kind == TokenKind.FunctionIndicator)
							{
								fStartIndex = this.t[iteratePosition - 1].Index;
							}
						}
						let fieldName:string = "";
						let InPureSemicolonSearch:boolean = false;
						let fBracketIndex = 0;
						for (let j = iteratePosition; j < length; ++j)
						{
							if (this.t[j].Kind == TokenKind.Identifier && !InPureSemicolonSearch)
							{
								fieldName = this.t[j].Value;
								continue;
							}
							if (this.t[j].Kind == TokenKind.Assignment)
							{
								InPureSemicolonSearch = true;
								continue;
							}
							if (this.t[j].Kind == TokenKind.Semicolon)
							{
								if (fStartIndex == fEndIndex && fBracketIndex == 0)
								{
									iteratePosition = j;
									fEndIndex = this.t[j].Index;
									break;
								}
							}
							if (this.t[j].Kind == TokenKind.BraceOpen)
							{
								if (!InPureSemicolonSearch)
								{
									InPureSemicolonSearch = true;
									fEndIndex = this.t[j].Index - 1;
								}
								++fBracketIndex;
							}
							else if (this.t[j].Kind == TokenKind.BraceClose)
							{
								--fBracketIndex;
								if (fBracketIndex == 0)
								{
									if ((j + 1) < length)
									{
										if (this.t[j + 1].Kind == TokenKind.Semicolon)
										{
											iteratePosition = j + 1;
										}
										else
										{
											iteratePosition = j;
										}
									}
									break;
								}
							}
						}
						if (fStartIndex < fEndIndex)
						{
							fields.push(
							{
								Index: fStartIndex,
								Length: fEndIndex - fStartIndex + 1,
								Name: fieldName,
								File: this.FileName,
								MethodmapName: methodMapName,
								FullName: this.source.substr(fStartIndex, fEndIndex - fStartIndex + 1)
							});
						}
					}
				}
			}
			if (enteredBlock && braceIndex == 0)
			{
				let mm:SMMethodmap =
				{
					Index: startIndex,
					Length: this.t[lastIndex].Index - startIndex + 1,
					Name: methodMapName,
					File: this.FileName,
					Type: methodMapType,
					InheritedType: inheriteType,
					Methods: methods,
					Fields: fields
				};

				this.def.Methodmaps.push(mm);
				this.position = lastIndex;
			}
		}
		return -1;
	}
	// #endregion
	// #region SMFunctionConsumer
	ConsumeSMFunction():number
	{
		let kind:SMFunctionKind = SMFunctionKind.Unknown;
		let startPosition = this.position;
		let iteratePosition = startPosition + 1;
		switch (this.t[startPosition].Value)
		{
			case "stock":
			{
				if ((startPosition + 1) < length)
				{
					if (this.t[startPosition + 1].Kind == TokenKind.FunctionIndicator)
					{
						if (this.t[startPosition + 1].Value == "static")
						{
							kind = SMFunctionKind.StockStatic;
							++iteratePosition;
							break;
						}
					}
				}
				kind = SMFunctionKind.Stock;
				break;
			}
			case "native":
			{
				kind = SMFunctionKind.Native;
				break;
			}
			case "forward":
			{
				kind = SMFunctionKind.Forward;
				break;
			}
			case "public":
			{
				if ((startPosition + 1) < length)
				{
					if (this.t[startPosition + 1].Kind == TokenKind.FunctionIndicator)
					{
						if (this.t[startPosition + 1].Value == "native")
						{
							kind = SMFunctionKind.PublicNative;
							++iteratePosition;
							break;
						}
					}
				}
				kind = SMFunctionKind.Public;
				break;
			}
			case "static":
			{
				kind = SMFunctionKind.Static;
				break;
			}
			case "normal":
			{
				kind = SMFunctionKind.Normal;
				break;
			}
		}
		let functionCommentString:string = "";
		let commentTokenIndex = this.BacktraceTestForToken(startPosition - 1, TokenKind.MultiLineComment, true, false);
		if (commentTokenIndex == - 1)
		{
			commentTokenIndex = this.BacktraceTestForToken(startPosition - 1, TokenKind.SingleLineComment, true, false);
			if (commentTokenIndex != -1)
			{
				let strBuilder = new StringBuilder(this.t[commentTokenIndex].Value);
				while ((commentTokenIndex = this.BacktraceTestForToken(commentTokenIndex - 1, TokenKind.SingleLineComment, true, false)) != -1)
				{
					strBuilder.Insert('\n');
					strBuilder.Insert(this.t[commentTokenIndex].Value);
				}
				functionCommentString = strBuilder.ToString();
			}
		}
		else
		{
			functionCommentString = this.t[commentTokenIndex].Value;
		}
		let functionReturnType:string = "";
		let functionName:string = "";
		for (; iteratePosition < startPosition + 5; ++iteratePosition)
		{
			if (this.t.length > (iteratePosition + 1))
			{
				if (this.t[iteratePosition].Kind == TokenKind.Identifier)
				{
					if (this.t[iteratePosition + 1].Kind == TokenKind.ParenthesisOpen)
					{
						functionName = this.t[iteratePosition].Value;
						break;
					}
					else
					{
						functionReturnType = this.t[iteratePosition].Value;
					}
					continue;
				}
				else if (this.t[iteratePosition].Kind == TokenKind.Character)
				{
					if (this.t[iteratePosition].Value.length > 0)
					{
						let testChar:string = this.t[iteratePosition].Value[0];
						if (testChar == ':' || testChar == '[' || testChar == ']')
						{
							continue;
						}
					}
				}
				return -1;
			}
			else
			{
				return -1;
			}
		}
		if (IsStringNullOrWhitespace(functionName))
		{
			return -1;
		}
		++iteratePosition;
		let functionParameters:string[] = [];
		let parameterDeclIndexStart = this.t[iteratePosition].Index;
		let parameterDeclIndexEnd = -1;
		let lastParameterIndex = parameterDeclIndexStart;
		let parenthesisCounter = 0;
		let gotCommaBreak:boolean = false;
		let outTokenIndex = -1;
		let braceState = 0;
		for (; iteratePosition < length; ++iteratePosition)
		{
			if (this.t[iteratePosition].Kind == TokenKind.ParenthesisOpen)
			{
				++parenthesisCounter;
				continue;
			}
			if (this.t[iteratePosition].Kind == TokenKind.ParenthesisClose)
			{
				--parenthesisCounter;
				if (parenthesisCounter == 0)
				{
					outTokenIndex = iteratePosition;
					parameterDeclIndexEnd = this.t[iteratePosition].Index;
					let length = (this.t[iteratePosition].Index - 1) - (lastParameterIndex + 1);
					if (gotCommaBreak)
					{
						if (length == 0)
						{
							functionParameters.push("");
						}
						else
						{
							functionParameters.push((this.source.substring(lastParameterIndex + 1, length + 1)).trim());
						}
					}
					else if (length > 0)
					{
						let singleParameterString:string = this.source.substring(lastParameterIndex + 1, length + 1);
						if (!IsStringNullOrWhitespace(singleParameterString))
						{
							functionParameters.push(singleParameterString);
						}
					}
					break;
				}
				continue;
			}
			if (this.t[iteratePosition].Kind == TokenKind.BraceOpen)
			{
				++braceState;
			}
			if (this.t[iteratePosition].Kind == TokenKind.BraceClose)
			{
				--braceState;
			}
			if (this.t[iteratePosition].Kind == TokenKind.Comma && braceState == 0)
			{
				gotCommaBreak = true;
				let length = (this.t[iteratePosition].Index - 1) - (lastParameterIndex + 1);
				if (length == 0)
				{
					functionParameters.push("");
				}
				else
				{
					functionParameters.push((this.source.substring(lastParameterIndex + 1, length + 1)).trim());
				}
				lastParameterIndex = this.t[iteratePosition].Index;
			}
		}
		if (parameterDeclIndexEnd == -1)
		{
			return -1;
		}
		this.def.Functions.push(
			{
				FunctionKind: kind,
				Index: this.t[startPosition].Index,
				File: this.FileName,
				Length: (parameterDeclIndexEnd - this.t[startPosition].Index) + 1,
				Name: functionName,
				FullName: this.TrimFullname(this.source.substr(this.t[startPosition].Index, (parameterDeclIndexEnd - this.t[startPosition].Index) + 1)),
				ReturnType: functionReturnType,
				CommentString: Condenser.TrimComments(functionCommentString),
				Parameters: Array.from(functionParameters)
			}
		);
		if ((outTokenIndex + 1) < length)
		{
			if (this.t[outTokenIndex + 1].Kind == TokenKind.Semicolon)
			{
				return outTokenIndex + 1;
			}
			let nextOpenBraceTokenIndex = this.FortraceTestForToken(outTokenIndex + 1, TokenKind.BraceOpen, true, false);
			if (nextOpenBraceTokenIndex != -1)
			{
				braceState = 0;
				for (let i = nextOpenBraceTokenIndex; i < length; ++i)
				{
					if (this.t[i].Kind == TokenKind.BraceOpen)
					{
						++braceState;
					}
					else if (this.t[i].Kind == TokenKind.BraceClose)
					{
						--braceState;
						if (braceState == 0)
						{
							return i;
						}
					}
				}
			}
		}
		return outTokenIndex;
	}
	// #endregion
	// #region SMEnumConsumer
	ConsumeSMEnum():number
	{
		let startIndex:number = this.t[this.position].Index;
		if ((this.position + 1) < length)
		{
			let iteratePosition = this.position;
			let enumName:string = "";
			while ((iteratePosition + 1) < length && this.t[iteratePosition].Kind != TokenKind.BraceOpen)
			{
				if (this.t[iteratePosition].Kind == TokenKind.Identifier)
				{
					enumName = this.t[iteratePosition].Value;
				}
				++iteratePosition;
			}
			let braceState = 0;
			let inIgnoreMode:boolean = false;
			let endTokenIndex = -1;
			let entries:string[] = [];
			for (; iteratePosition < length; ++iteratePosition)
			{
				if (this.t[iteratePosition].Kind == TokenKind.BraceOpen)
				{
					++braceState;
					continue;
				}
				if (this.t[iteratePosition].Kind == TokenKind.BraceClose)
				{
					--braceState;
					if (braceState == 0)
					{
						endTokenIndex = iteratePosition;
						break;
					}
					continue;
				}
				if (inIgnoreMode)
				{
					if (this.t[iteratePosition].Kind == TokenKind.Comma)
					{
						inIgnoreMode = false;
					}
					continue;
				}
				if (this.t[iteratePosition].Kind == TokenKind.Identifier)
				{
					entries.push(this.t[iteratePosition].Value);
					inIgnoreMode = true;
				}
			}
			if (endTokenIndex == -1)
			{
				return -1;
			}
			this.def.Enums.push(
				{
					Index: startIndex,
					Length: (this.t[endTokenIndex].Index - startIndex) + 1,
					File: this.FileName,
					Entries: Array.from(entries),
					Name: enumName
				}
			);
			return endTokenIndex;
		}
		return -1;
	}
	// #endregion
	// #region SMConstantConsumer
	ConsumeSMConstant():number
	{
		if ((this.position + 2) < length)
		{
			let startIndex:number = this.t[this.position].Index;
			let foundIdentifier:boolean = false;
			let foundAssignment:boolean = false;
			let constantName:string = "";
			for (let i = this.position + 2; i < length; ++i)
			{
				if (this.t[i].Kind == TokenKind.Semicolon)
				{
					if (!foundIdentifier)
					{
						if (this.t[i - 1].Kind == TokenKind.Identifier)
						{
							constantName = this.t[i - 1].Value;
							foundIdentifier = true;
						}
					}
					if (!IsStringNullOrWhitespace(constantName))
					{
						this.def.Constants.push(
							{
								Index: startIndex,
								Length: this.t[i].Index - startIndex,
								File: this.FileName,
								Name: constantName
							}
						);
					}
					return i;
				}
				else if (this.t[i].Kind == TokenKind.Assignment)
				{
					foundAssignment = true;
					if (this.t[i - 1].Kind == TokenKind.Identifier)
					{
						foundIdentifier = true;
						constantName = this.t[i - 1].Value;
					}
				}
				else if (this.t[i].Kind == TokenKind.Character && !foundAssignment)
				{
					if (this.t[i].Value == "[")
					{
						if (this.t[i - 1].Kind == TokenKind.Identifier)
						{
							foundIdentifier = true;
							constantName = this.t[i - 1].Value;
						}
					}
				}
				else if (this.t[i].Kind == TokenKind.EOL) //failsafe
				{
					return i;
				}
			}
		}
		return -1;
	}
	// #endregion
}