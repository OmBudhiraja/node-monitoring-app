class Validate {
  #validateFor;
  #valueType;
  constructor(validateFor) {
    this.#validateFor = validateFor;
    this.#valueType = typeof validateFor;
    this.errors = [];
  }

  required() {
    if (
      this.#validateFor === null ||
      this.#validateFor === undefined ||
      (typeof this.#validateFor === 'string' && !this.#validateFor.length)
    ) {
      this.errors.push(`Value is required`);
    }
    return this;
  }

  toBe(type) {
    if (typeof this.#validateFor !== type) {
      this.errors.push(
        `Expected the value to be of type ${type}, but got ${typeof this
          .#validateFor}`
      );
    }
    return this;
  }

  value(...valueToChecks) {
    if (!valueToChecks.includes(this.#validateFor)) {
      const valueString = valueToChecks.join('or');
      this.errors.push(
        `Expected the value to be ${valueToChecks.join(', or ')}, but got ${
          this.#validateFor
        }`
      );
    }
    return this;
  }

  minLength(length) {
    if (this.errors.length) {
      return this;
    }
    if (
      (this.#valueType === 'string' &&
        this.#validateFor.trim().length < length) ||
      (Array.isArray(this.#validateFor) && this.#validateFor.length < length)
    ) {
      this.errors.push(
        `Minimum length was ${length}, but got ${this.#validateFor.length}`
      );
    }
    return this;
  }

  maxLength(length) {
    if (this.errors.length) {
      return this;
    }
    if (
      (this.#valueType === 'string' &&
        this.#validateFor.trim().length > length) ||
      (Array.isArray(this.#validateFor) && this.#validateFor.length > length)
    ) {
      this.errors.push(
        `Maximum length was ${length}, but got ${this.#validateFor.length}`
      );
    }
    return this;
  }

  min(value) {
    if (typeof value !== 'number') {
      return this;
    }
    if (this.#validateFor < value) {
      this.errors.push(
        `Minimum Value should be ${value}, but got ${this.#validateFor}`
      );
    }
    return this;
  }

  max(value) {
    if (typeof value !== 'number') {
      return this;
    }
    if (this.#validateFor > value) {
      this.errors.push(
        `Maximum Value should be ${value}, but got ${this.#validateFor}`
      );
    }
    return this;
  }

  check() {
    return this.errors.length ? this.errors[0] : null;
  }
}

function ValidateWrapper(validateFor) {
  return new Validate(validateFor);
}

export default ValidateWrapper;
