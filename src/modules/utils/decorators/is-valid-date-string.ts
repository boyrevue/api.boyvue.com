import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

@ValidatorConstraint({ async: true })
export class IsValidDateStringConstraint implements ValidatorConstraintInterface {
  validate(text: string) {
    if (!text) {
      return false;
    }

    return Date.parse(text) > 0;
  }

  defaultMessage() {
    return '($value) is invaid date string!';
  }
}

export function IsValidDateString(validationOptions?: ValidationOptions) {
  return (object: Object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDateStringConstraint
    });
  };
}
