export interface SMMethodmapField
{
	Index: number;
	Length: number;
	File: string;

	Name: string;
	MethodmapName: string;
	FullName: string;
	//string Type; not needed yet
}

export interface SMMethodmapMethod
{
	Index: number;
	Length: number;
	File: string;

	Name: string;
	MethodmapName: string;
	FullName: string;
	ReturnType: string;
	CommentString: string;
	Parameters: string[];
	MethodKind: string[];
}

export interface SMMethodmap
{
	Index: number;
	Length: number;
	File: string;

	Name: string;
	Type: string;
	InheritedType: string;
	Fields: SMMethodmapField[];
	Methods: SMMethodmapMethod[];
}