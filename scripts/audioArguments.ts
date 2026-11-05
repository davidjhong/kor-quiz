export const namedArguments = (args: string[], valueNames: string[], flagNames: string[] = []) => {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    if (valueNames.includes(name) && !values.has(name)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
      values.set(name, value);
    } else if (flagNames.includes(name) && !flags.has(name)) flags.add(name);
    else throw new Error(`Unknown or repeated argument: ${name}`);
  }
  return {values, flags, required: (name: string) => {
    const value = values.get(name);
    if (!value) throw new Error(`Missing ${name}`);
    return value;
  }};
};
