import
{
	CompletionItem,
	CompletionItemKind,
	DefinitionLink
} from 'vscode-languageserver';

// NOTE: the properties and methods are maps so that we can easily inherit properties and methods
// 		 as well as filter out any duplicates that may pop up while we are parsing.
export class Variable
{
	// either the name of the methodmap or the name of the variable
	label: string;
	// name of it's data type, if methodmap returns it's label
	className: string | null;
	// the kind of data type is the label is
	kind: CompletionItemKind;
	// A map of properties using the label to identify them to their completion items
	properties: Map<string, CompletionItem>;
	// A map of method using the label to identify them to their completion items
	methods: Map<string, CompletionItem>;
	// Link to where the variable was declared. null since it might not be used yet.
	declarationLocation: DefinitionLink | null;
	// The scope that this variable has access to. null since it might not be used yet.
	scope: Range | null;
	// Additional text that might be used to describe the variable. null since it might not be used yet.
	description: string | null;
	constructor(name: string, classname: string | null, completionkind: CompletionItemKind)
	{
		this.label = name;
		this.className = classname;
		this.kind = completionkind;
		this.properties = new Map();
		this.methods = new Map();
		this.declarationLocation = null;
		this.scope = null;
		this.description = null;
	}

	// inherits the properties and methods of it's parent class.
	// should be ran before 'this' has any methods assigned
	inherit(parentClass:Variable): void
	{
		this.properties = new Map(parentClass.properties);
		this.methods = new Map(parentClass.methods);
	}

	// converts the variable to an array of completion items for each of it's properties and methods along with itself.
	toCompletionItems(): CompletionItem[]
	{
		let returnValue: CompletionItem[] = [];
		let tempItem: CompletionItem = CompletionItem.create(this.label);
		tempItem.kind = this.kind;
		if (this.description !== null)
		{
			tempItem.documentation = this.description;
		}

		returnValue.push(tempItem);
		if (this.properties.size !== 0)
		{
			returnValue = returnValue.concat(Array.from(this.properties.values()));
		}

		if (this.methods.size !== 0)
		{
			returnValue = returnValue.concat(Array.from(this.methods.values()));
		}

		return returnValue;
	}
}