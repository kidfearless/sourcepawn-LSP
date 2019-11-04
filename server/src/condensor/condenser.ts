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
	
	string FileName = string.Empty;

	constructor(string sourceCode, string fileName)
	{
		t = Tokenizer.Tokenizer.TokenizeString(sourceCode, true).ToArray();
		position = 0;
		length = t.Length;
		def = new SMDefinition();
		source = sourceCode;
		if (fileName.EndsWith(".inc", StringComparison.InvariantCultureIgnoreCase))
		{
			fileName = fileName.Substring(0, fileName.Length - 4);
		}
		FileName = fileName;
	}

	export  Condense():SMDefinition
	{
		Token ct = null;
		while ((ct = t[position]).Kind != TokenKind.EOF)
		{
			if (ct.Kind == TokenKind.FunctionIndicator)
			{
				number newIndex = ConsumeSMFunction();
				if (newIndex != -1)
				{
					position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.Enum)
			{
				number newIndex = ConsumeSMEnum();
				if (newIndex != -1)
				{
					position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.Struct)
			{
				number newIndex = ConsumeSMStruct();
				if (newIndex != -1)
				{
					position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.PrePocessorDirective)
			{
				number newIndex = ConsumeSMPPDirective();
				if (newIndex != -1)
				{
					position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.Constant)
			{
				number newIndex = ConsumeSMConstant();
				if (newIndex != -1)
				{
					position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.MethodMap)
			{
				number newIndex = ConsumeSMMethodmap();
				if (newIndex != -1)
				{
					position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.TypeSet)
			{
				number newIndex = ConsumeSMTypeset();
				if (newIndex != -1)
				{
					position = newIndex + 1;
					continue;
				}
			}
			if (ct.Kind == TokenKind.TypeDef)
			{
				number newIndex = ConsumeSMTypedef();
				if (newIndex != -1)
				{
					position = newIndex + 1;
					continue;
				}
			}

			++position;
		}
		def.Sort();
		return def;
	}

	BacktraceTestForToken(number StartPosition, TokenKind TestKind, bool IgnoreEOL, bool IgnoreOtherTokens):number
	{
		for (number i = StartPosition; i >= 0; --i)
		{
			if (t[i].Kind == TestKind)
			{
				return i;
			}
			else if (IgnoreOtherTokens)
			{
				continue;
			}
			else if (t[i].Kind == TokenKind.EOL && IgnoreEOL)
			{
				continue;
			}
			return -1;
		}
		return -1;
	}
	FortraceTestForToken(number StartPosition, TokenKind TestKind, bool IgnoreEOL, bool IgnoreOtherTokens):number
	{
		for (number i = StartPosition; i < length; ++i)
		{
			if (t[i].Kind == TestKind)
			{
				return i;
			}
			else if (IgnoreOtherTokens)
			{
				continue;
			}
			else if (t[i].Kind == TokenKind.EOL && IgnoreEOL)
			{
				continue;
			}
			return -1;
		}
		return -1;
	}

	function TrimComments(string comment): string
	{
		StringBuilder outString = new StringBuilder();
		string[] lines = comment.Split('\r', '\n');
		string line;
		for (number i = 0; i < lines.Length; ++i)
		{
			line = (lines[i].Trim()).TrimStart('/', '*', ' ', '\t');
			if (!string.IsNullOrWhiteSpace(line))
			{
				if (i > 0) { outString.AppendLine(); }
				if (line.StartsWith("@param"))
				{
					outString.Append(FormatParamLineString(line));
				}
				else
				{
					outString.Append(line);
				}
			}
		}
		return outString.ToString().Trim();
	}
	function TrimFullname(string name):string
	{
		StringBuilder outString = new StringBuilder();
		string[] lines = name.Split('\r', '\n');
		for (number i = 0; i < lines.Length; ++i)
		{
			if (!string.IsNullOrWhiteSpace(lines[i]))
			{
				if (i > 0)
				{
					outString.Append(" ");
				}
				outString.Append(lines[i].Trim(' ', '\t'));
			}
		}
		return outString.ToString();
	}

	function FormatParamLineString(string line):string
	{
		string[] split = line.Replace('\t', ' ').Split(new char[] { ' ' }, 3);
		if (split.Length > 2)
		{
			return ("@param " + split[1]).PadRight(24, ' ') + " " + split[2].Trim(' ', '\t');
		}
		return line;
	}
}