import {TokenKind} from './TokenKind';
export class Token
{
	Value:string;
	Kind:TokenKind;
	Index:number;
	Length:number;
	public constructor(Value_:string, Kind_:TokenKind, Index_:number)
	{
		this.Value = Value_;
		this.Kind = Kind_;
		this.Index = Index_;
		this.Length = Value_.length;
	}
}
