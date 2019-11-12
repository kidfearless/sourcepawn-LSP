import { SMFunction } from './SMFunction';
import { SMEnum } from './SMEnum';
import { SMDefine } from './SMDefine';
import { SMConstant } from './SMConstant';
import { SMMethodmap } from './SMMethodmap';
// import { Condenser } from '../condenser';
import { SMStruct } from './SMStruct';
import { SMTypedef } from './SMTypedef';
import * as fs from 'fs';
import { Directory } from '../../classes';
import { Condenser } from '../condenser';
import { parse } from 'path';

export class SMDefinition
{
	Functions: SMFunction[] = [];
	Enums: SMEnum[] = [];
	Structs: SMStruct[] = [];
	Defines: SMDefine[] = [];
	Constants: SMConstant[] = [];
	Methodmaps: SMMethodmap[] = [];
	Typedefs: SMTypedef[] = [];

	//string[] EnumStrings = new string[0]; NOT NEEDED
	//string[] StructStrings = new string[0]; NOT NEEDED
	//string[] DefinesStrings = new string[0]; NOT NEEDED
	FunctionStrings: string[] = [];
	ConstantsStrings: string[] = [];
	MethodmapsStrings: string[] = [];
	MethodsStrings: string[] = [];
	FieldStrings: string[] = [];
	TypeStrings: string[] = [];

	Sort()
	{
		try
		{
			this.Functions = this.Functions.filter((firstValue: SMFunction, firstIndex: number, firstArray: SMFunction[]) =>
			{
				return firstArray.every((secondValue: SMFunction, secondIndex: number, secondArray: SMFunction[]) =>
				{
					return firstValue.Name !== secondValue.Name;
				});
			});
			this.Functions.sort();

			//Enums = Enums.Distinct(new SMEnumComparer()); //enums can have the same name but not be the same...
			this.Enums.sort();

			this.Structs = this.Structs.filter((firstValue: SMStruct, firstIndex: number, firstArray: SMStruct[]) =>
			{
				return firstArray.every((secondValue: SMStruct, secondIndex: number, secondArray: SMStruct[]) =>
				{
					return firstValue.Name !== secondValue.Name;
				});
			});
			this.Structs.sort();

			this.Defines = this.Defines.filter((firstValue: SMDefine, firstIndex: number, firstArray: SMDefine[]) =>
			{
				return firstArray.every((secondValue: SMDefine, secondIndex: number, secondArray: SMDefine[]) =>
				{
					return firstValue.Name !== secondValue.Name;
				});
			});
			this.Defines.sort();
			
			
			this.Constants = this.Constants.filter((firstValue: SMConstant, firstIndex: number, firstArray: SMConstant[]) =>
			{
				return firstArray.every((secondValue: SMConstant, secondIndex: number, secondArray: SMConstant[]) =>
				{
					return firstValue.Name !== secondValue.Name;
				});
			});
			this.Constants.sort();
		}
		catch (Exception) { } //racing condition on save when the thread closes first or not..
	}

	AppendFiles(paths: string[])
	{
		for (let i = 0; i < paths.length; ++i)
		{
			if (!Directory.Exists(paths[i]))
			{
				continue;
			}
			let files:string[]|false = Directory.GetFiles(paths[i], /\*.inc/);
			if(!files)
			{
				continue;
			}

			for (let j = 0; j < files.length; ++j)
			{
				let text:string|false =  Directory.ReadAllText(files[j]);
				if(!text)
				{
					continue;
				}
				let subCondenser:Condenser = new Condenser(text, parse(files[j]).base);
				var subDefinition = subCondenser.Condense();
				this.Functions = this.Functions.concat(subDefinition.Functions);
				this.Enums = this.Enums.concat(subDefinition.Enums);
				this.Structs = this.Structs.concat(subDefinition.Structs);
				this.Defines = this.Defines.concat(subDefinition.Defines);
				this.Constants = this.Constants.concat(subDefinition.Constants);
				this.Methodmaps = this.Methodmaps.concat(subDefinition.Methodmaps);
				this.Typedefs = this.Typedefs.concat(subDefinition.Typedefs);
			}
			
		}
		this.Sort();
		this.ProduceStringArrays();
	}

	ProduceStringArrays()
	{
		this.FunctionStrings = [];
		for (let i = 0; i < this.Functions.length; ++i)
		{
			this.FunctionStrings.push(this.Functions[i].Name);
		}
		this.Methodmaps.forEach((mm) =>
		{
			this.MethodmapsStrings.push(mm.Name);
			mm.Methods.forEach((m) =>
			{
				this.MethodsStrings.push(m.Name);
			});
			mm.Fields.forEach((f) =>
			{
				this.FieldStrings.push(f.Name);
			});
		});
		
		this.Constants.forEach(i =>
		{
			this.ConstantsStrings.push(i.Name); 
		});
		this.Enums.forEach((e) => 
		{
			this.ConstantsStrings = this.ConstantsStrings.concat(e.Entries); 
		});
		this.Defines.forEach((i) =>
		{
			this.ConstantsStrings.push(i.Name); 
		});

		this.ConstantsStrings.sort();
		// this.TypeStrings.Capacity = this.Enums.length + this.Structs.length + this.Methodmaps.length;
		this.Enums.forEach((i) =>
		{
			this.TypeStrings.push(i.Name);
		});
		this.Structs.forEach((i) =>
		{
			this.TypeStrings.push(i.Name);
		});
		this.Methodmaps.forEach((i) =>
		{
			this.TypeStrings.push(i.Name);
		});
		this.Typedefs.forEach((i) =>
		{
			this.TypeStrings.push(i.Name);
		});
		this.TypeStrings.sort();
	}

	ProduceACNodes(): ACNode[]
	{
		let nodes: ACNode[] = [];
		try
		{
			// Node.Capacity = this.Enums.Count + this.Structs.Count + this.Constants.Count + this.Functions.Count;
			nodes = nodes.concat(ACNode.ConvertFromStringArray(this.FunctionStrings, true, "▲ "));
			nodes = nodes.concat(ACNode.ConvertFromStringArray(this.TypeStrings, false, "♦ "));
			nodes = nodes.concat(ACNode.ConvertFromStringArray(this.ConstantsStrings, false, "• "));
			nodes = nodes.concat(ACNode.ConvertFromStringArray(this.MethodmapsStrings, false, "↨ "));
			//nodes = nodes.Distinct(new ACNodeEqualityComparer()); Methodmaps and Functions can and will be the same.
			nodes.sort();
		}
		catch (Exception) 
		{

		}
		return nodes;
	}
	ProduceISNodes(): ISNode[]
	{
		let nodes: ISNode[] = [];
		try
		{
			nodes = nodes.concat(ISNode.ConvertFromStringArray(this.MethodsStrings, true, "▲ "));
			nodes = nodes.concat(ISNode.ConvertFromStringArray(this.FieldStrings, false, "• "));


			nodes = nodes.filter((firstValue:ISNode, firstIndex: number, firstArray:ISNode[]) =>
			{
				return firstArray.every((secondValue:ISNode, secondIndex: number, secondArray:ISNode[]) =>
				{
					return firstValue.Name !== secondValue.Name;
				});
			});
			nodes.sort();
		} catch (Exception) { }
		return nodes;
	}

	MergeDefinitions(def:SMDefinition)
	{
		try
		{
			this.Functions = this.Functions.concat(def.Functions);
			this.Enums = this.Enums.concat(def.Enums);
			this.Structs = this.Structs.concat(def.Structs);
			this.Defines = this.Defines.concat(def.Defines);
			this.Constants = this.Constants.concat(def.Constants);
			this.Methodmaps = this.Methodmaps.concat(def.Methodmaps);
		}
		catch (Exception) { }
	}

	ProduceTemporaryExpandedDefinition(definitions: SMDefinition[]): SMDefinition
	{
		let def:SMDefinition = new SMDefinition();
		try
		{
			def.MergeDefinitions(this);
			for (let i = 0; i < definitions.length; ++i)
			{
				if (definitions[i] != null)
				{
					def.MergeDefinitions(definitions[i]);
				}
			}
			def.Sort();
			def.ProduceStringArrays();
		} catch (Exception) { }
		return def;
	}
}

class ACNode
{
	static ConvertFromStringArray(strings:string[], Executable:boolean, prefix:string = ""): ACNode[]
	{
		let nodeList: ACNode[] = [];
		for (let i: number = 0; i < strings.length; ++i)
		{
			nodeList.push(new ACNode(prefix + strings[i], strings[i], Executable));
		}
		return nodeList;
	}
	Name: string;
	EntryName: string;
	IsExecuteable: boolean = false;

	constructor(name: string, entryName: string, isExecutable: boolean)
	{
		this.Name = name;
		this.EntryName = entryName;
		this.IsExecuteable = isExecutable;
	}

	ToString(): string
	{
		return this.Name;
	}
}

class ISNode
{
	static ConvertFromStringArray(strings: string[], Executable: boolean, prefix: string = ''): ISNode[]
	{
		let nodeList: ACNode[] = [];
		for (let i: number = 0; i < strings.length; ++i)
		{
			nodeList.push(new ACNode(prefix + strings[i], strings[i], Executable));
		}
		return nodeList;
	}
	Name: string;
	EntryName: string;
	IsExecuteable: boolean = false;

	constructor(name: string, entryName: string, isExecutable: boolean)
	{
		this.Name = name;
		this.EntryName = entryName;
		this.IsExecuteable = isExecutable;
	}

	ToString(): string
	{
		return this.Name;
	}
}