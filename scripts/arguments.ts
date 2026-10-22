export type RenderArguments = {input: string; output: string; overwrite: boolean; preview?: true; illustratedPreview?: true; illustrated?: true};

export const RENDER_USAGE = 'npm.cmd run render -- --input content/sample.json --output out/sample.mp4 [--overwrite] [--preview | --illustrated-preview | --illustrated]';

export const parseRenderArguments = (args: string[]): RenderArguments | null => {
  if (args.length === 1 && args[0] === '--help') return null;
  const values = new Map<string, string>();
  let overwrite = false;
  let preview = false;
  let illustratedPreview = false;
  let illustrated = false;
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--preview' && !preview) {
      preview = true;
    } else if (flag === '--illustrated-preview' && !illustratedPreview) {
      illustratedPreview = true;
    } else if (flag === '--illustrated' && !illustrated) {
      illustrated = true;
    } else if (flag === '--overwrite' && !overwrite) {
      overwrite = true;
    } else if ((flag === '--input' || flag === '--output') && !values.has(flag)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}\n${RENDER_USAGE}`);
      values.set(flag, value);
    } else {
      throw new Error(`Unknown or repeated argument: ${flag}\n${RENDER_USAGE}`);
    }
  }
  const input = values.get('--input');
  const output = values.get('--output');
  if (!input || !output) throw new Error(`Both --input and --output are required\n${RENDER_USAGE}`);
  if (preview && illustratedPreview) throw new Error('Choose either --preview or --illustrated-preview, not both');
  if (illustrated && (preview || illustratedPreview)) throw new Error('Choose --illustrated or a single-question preview mode, not both');
  if (preview) return {input, output, overwrite, preview: true};
  if (illustratedPreview) return {input, output, overwrite, illustratedPreview: true};
  if (illustrated) return {input, output, overwrite, illustrated: true};
  return {input, output, overwrite};
};
