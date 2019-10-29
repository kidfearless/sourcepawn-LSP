import
{
	CompletionItem,
	CompletionItemKind,
	DefinitionLink
} from 'vscode-languageserver';

export class Variable
{
	label: string;
	className: string|null;
	kind: CompletionItemKind;
	properties: CompletionItem[];
	methods: CompletionItem[];
	declarationLocation: DefinitionLink|null;
	scope: Range|null;
	constructor(name:string, classname:string|null, completionkind:CompletionItemKind)
	{
		this.label = name;
		this.className = classname;
		this.kind = completionkind;
		this.properties = [];
		this.methods = [];
		this.declarationLocation = null;
		this.scope = null;
	}

	toCompletionItems(): CompletionItem[]
	{
		let returnValue: CompletionItem[] = [];
		let tempItem: CompletionItem = CompletionItem.create(this.label);
		tempItem.kind = this.kind;

		returnValue.push(tempItem);
		if(this.properties.length !== 0)
		{
			returnValue = returnValue.concat(this.properties);
		}

		if(this.methods.length !== 0)
		{
			returnValue = returnValue.concat(this.methods);
		}

		return returnValue;
	}
}