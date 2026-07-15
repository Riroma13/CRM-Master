export function injectWhere(args: any, fields: Record<string, string>): any {
  if (!args.where) args.where = {};
  args.where = { ...args.where, ...fields };
  return args;
}

export function injectData(args: any, fields: Record<string, string>): any {
  if (args.data) args.data = { ...args.data, ...fields };
  return args;
}

export function injectDataArray(args: any, fields: Record<string, string>): any {
  if (args.data) {
    args.data = (args.data as any[]).map((d: any) => ({ ...d, ...fields }));
  }
  return args;
}
