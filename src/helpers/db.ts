const reservedWords = ["token"];
const reservedWordsSet = new Set(reservedWords);
const isReserved = (s: string) => reservedWordsSet.has(s);

type Result = {
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues: Record<string, any>;
  UpdateExpression: string;
};

export const generateUpdateExpr = (data: any) => {
  const ExpressionAttributeNames: Record<string, string> = {};
  const result: Result = {
    ExpressionAttributeValues: {},
    UpdateExpression: "",
  };

  const expressions: {
    set: string[];
    add: string[];
  } = {
    set: [],
    add: [],
  };

  const generateExprRecurse = (d = data, deref = "") => {
    for (let [k, v] of Object.entries(d)) {
      let placeholder = k;
      if (isReserved(k)) {
        placeholder = `#${k}`;
        ExpressionAttributeNames[placeholder] = k;
      }

      if (/Object/.test(Object.prototype.toString.call(v))) {
        generateExprRecurse(v, `${deref + placeholder}.`);
      } else {
        const path = deref + placeholder;
        const attrValKey = `:${k}`;
        result.ExpressionAttributeValues[attrValKey] = v;

        if (!Array.isArray(v)) {
          expressions.set.push(`${path} = ${attrValKey}`);
        } else {
          expressions.set.push(`${path} = ${`list_append(${path}, ${attrValKey})`}`);
        }
      }
    }
  };

  generateExprRecurse();

  if (expressions.set.length) {
    result.UpdateExpression = "set " + expressions.set.join(", ");
  }

  if (expressions.add.length) {
    result.UpdateExpression = "add " + expressions.add.join(", ");
  }

  if (Object.keys(ExpressionAttributeNames).length) {
    result.ExpressionAttributeNames = ExpressionAttributeNames;
  }

  return result;
};
