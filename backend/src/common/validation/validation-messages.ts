import {
  getMetadataStorage,
  ValidationError,
} from 'class-validator';

const messages: Record<string, string> = {
  isNotEmpty: ':property is required',

  isEmail:
    ':property must be a valid email address',

  isString:
    ':property must be a string',

  minLength:
    ':property must contain at least :constraint1 characters',

  maxLength:
    ':property must not exceed :constraint1 characters',

  isEnum:
    ':property contains an invalid value',

  isDateString:
    ':property must be a valid date',

  isBoolean:
    ':property must be a boolean',

  isNumber:
    ':property must be a number',

  isInt:
    ':property must be an integer',

  isUUID:
    ':property must be a valid UUID',

  isUrl:
    ':property must be a valid URL',
};

export function getValidationMessage(
  error: ValidationError,
): string {
  const constraint = Object.keys(
    error.constraints ?? {},
  )[0];

  if (!constraint) {
    return 'Invalid value';
  }

  const originalMessage =
    error.constraints?.[constraint] ?? '';

  // Check whether the DTO explicitly provided
  // a custom validation message.
  const customMessage = getCustomMessage(
    error,
    constraint,
  );

  // DTO message has the highest priority.
  const template =
    customMessage ??
    messages[constraint] ??
    originalMessage;

  const constraint1 = extractConstraint1(
    constraint,
    originalMessage,
  );

  return template
    .replace(
      ':property',
      formatProperty(error.property),
    )
    .replace(
      ':constraint1',
      String(constraint1 ?? ''),
    );
}

function getCustomMessage(
  error: ValidationError,
  constraint: string,
): string | undefined {
  if (!error.target) {
    return undefined;
  }

  const target = error.target.constructor;

  const metadataStorage =
    getMetadataStorage();

  const metadatas =
    metadataStorage.getTargetValidationMetadatas(
      target,
      '',
      false,
      false,
    );

  const propertyMetadatas =
    metadatas.filter(
      (metadata) =>
        metadata.propertyName === error.property,
    );

  const metadata = propertyMetadatas.find(
    (metadata) =>
      metadata.name === constraint,
  );

  if (!metadata) {
    return undefined;
  }

  if (
    typeof metadata.message === 'string'
  ) {
    return metadata.message;
  }

  return undefined;
}

function extractConstraint1(
  constraint: string,
  message: string,
): string | undefined {
  switch (constraint) {
    case 'minLength': {
      const match = message.match(
        /longer than or equal to (\d+) characters/,
      );

      return match?.[1];
    }

    case 'maxLength': {
      const match = message.match(
        /shorter than or equal to (\d+) characters/,
      );

      return match?.[1];
    }

    default:
      return undefined;
  }
}

function formatProperty(property: string): string {
  return property
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) =>
      char.toUpperCase(),
    );
}