export interface SMFunction
{
	Index: number;
	Length: number;
	File: string;
	Name: string;
	FullName: string;
	ReturnType: string;
	CommentString: string;
	Parameters: string[];
	FunctionKind: SMFunctionKind;
}

export enum SMFunctionKind
{
	Stock,
	StockStatic,
	Native,
	Forward,
	Public,
	PublicNative,
	Static,
	Normal,
	Unknown
}
