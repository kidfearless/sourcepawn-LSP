import
{
	LocationLink
} from 'vscode-languageserver';

export function LinkLocationToString(location: LocationLink): string
{
	let ret:string = `${location.targetUri} (${location.targetRange.start.line}:${location.targetRange.start.character} - ${location.targetRange.end.line}:${location.targetRange.end.character})`;
	return ret;
}