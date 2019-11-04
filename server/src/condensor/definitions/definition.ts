import { SMFunction } from './SMFunction';
import { SMEnum } from './SMEnum';
import { SMDefine } from './SMDefine';
import { SMConstant } from './SMConstant';
import { SMMethodmap } from './SMMethodmap';
import { Condenser } from '../condenser';
import { SMStruct } from './SMStruct';
import { SMTypedef } from './SMTypedef';


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

	/* AppendFiles(paths: string[])
	{
		for (let i = 0; i < paths.Length; ++i)
		{
			if (Directory.Exists(paths[i]))
			{
				string[] files = Directory.GetFiles(paths[i], "*.inc", SearchOption.AllDirectories);
				for (let j = 0; j < files.Length; ++j)
				{
					FileInfo fInfo = new FileInfo(files[j]);
					Condenser subCondenser = new Condenser(File.ReadAllText(fInfo.FullName), fInfo.Name);
					var subDefinition = subCondenser.Condense();
					Functions.AddRange(subDefinition.Functions);
					Enums.AddRange(subDefinition.Enums);
					Structs.AddRange(subDefinition.Structs);
					Defines.AddRange(subDefinition.Defines);
					Constants.AddRange(subDefinition.Constants);
					Methodmaps.AddRange(subDefinition.Methodmaps);
					Typedefs.AddRange(subDefinition.Typedefs);
				}
			}
		}
		this.Sort();
		this.ProduceStringArrays();
	} */

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
		
		this.Constants.forEach(var i in this.Constants) 
		{
			this.ConstantsStrings.push(i.Name); 
		}
		this.Enums.forEach(var e in this.Enums) 
		{
			this.ConstantsStrings.AddRange(e.Entries); 
		}
		this.Defines.forEach(var i in this.Defines) 
		{
			this.ConstantsStrings.push(i.Name); 
		}

		this.ConstantsStrings.sort((a, b) => string.Compare(a, b));
		this.ConstantsStrings = constantNames;
		List < string > typeNames = new List<string>();
		typeNames.Capacity = this.Enums.Count + this.Structs.Count + this.Methodmaps.Count;
		foreach(var i in this.Enums) { typeNames.Add(i.Name); }
		foreach(var i in this.Structs) { typeNames.Add(i.Name); }
		foreach(var i in this.Methodmaps) { typeNames.Add(i.Name); }
		foreach(var i in this.Typedefs) { typeNames.Add(i.Name); }
		typeNames.Sort((a, b) => string.Compare(a, b));
		this.TypeStrings = typeNames;
	}

	ProduceACNodes(): ACNode[]
	{
		List < ACNode > nodes = new List<ACNode>();
		try
		{
			nodes.Capacity = this.Enums.Count + this.Structs.Count + this.Constants.Count + this.Functions.Count;
			nodes.AddRange(ACNode.ConvertFromStringArray(this.FunctionStrings, true, "▲ "));
			nodes.AddRange(ACNode.ConvertFromStringArray(this.TypeStrings, false, "♦ "));
			nodes.AddRange(ACNode.ConvertFromStringArray(this.ConstantsStrings, false, "• "));
			nodes.AddRange(ACNode.ConvertFromStringArray(this.MethodmapsStrings, false, "↨ "));
			//nodes = nodes.Distinct(new ACNodeEqualityComparer()); Methodmaps and Functions can and will be the same.
			nodes.Sort((a, b) => { return string.Compare(a.EntryName, b.EntryName); });
		} catch (Exception) { }
		return nodes;
	}
	ProduceISNodes(): ISNode[]
	{
		List < ISNode > nodes = new List<ISNode>();
		try
		{
			nodes.AddRange(ISNode.ConvertFromStringArray(this.MethodsStrings, true, "▲ "));
			nodes.AddRange(ISNode.ConvertFromStringArray(this.FieldStrings, false, "• "));
			nodes = nodes.Distinct(new ISNodeEqualityComparer());
			nodes.Sort((a, b) => { return string.Compare(a.EntryName, b.EntryName); });
		} catch (Exception) { }
		return nodes;
	}

	MergeDefinitions(SMDefinition def)
	{
		try
		{
			this.Functions.AddRange(def.Functions);
			this.Enums.AddRange(def.Enums);
			this.Structs.AddRange(def.Structs);
			this.Defines.AddRange(def.Defines);
			this.Constants.AddRange(def.Constants);
			this.Methodmaps.AddRange(def.Methodmaps);
		}
		catch (Exception) { }
	}

	ProduceTemporaryExpandedDefinition(definitions: SMDefinition[]): SMDefinition
	{
		SMDefinition def = new SMDefinition();
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

namespace ACNode
{
	function ConvertFromStringArray(strings: string[], Executable: boolean, prefix: string = ''): ACNode[]
	{
		let nodeList: ACNode[] = [];
		for (let i: number = 0; i < strings.length; ++i)
		{
			nodeList.push(new ACNode(prefix + strings[i], strings[i], Executable));
		}
		return nodeList;
	}
}

class ISNode
{
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

namespace ISNode
{
	function ConvertFromStringArray(strings: string[], Executable: boolean, prefix: string = ''): ISNode[]
	{
		let nodeList: ISNode[] = [];
		for (let i: number = 0; i < strings.length; ++i)
		{
			nodeList.push(new ISNode(prefix + strings[i], strings[i], Executable));
		}
		return nodeList;
	}
}