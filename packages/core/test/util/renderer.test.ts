/*
  The MIT License
  
  Copyright (c) 2017-2019 EclipseSource Munich
  https://github.com/eclipsesource/jsonforms
  
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/
import * as _ from 'lodash';
import { init, update, UPDATE_DATA, UpdateAction } from '../../src/actions';
import * as Redux from 'redux';
import {
  clearAllIds,
  computeLabel,
  createAjv,
  createDefaultValue,
  mapDispatchToArrayControlProps,
  mapDispatchToControlProps,
  mapStateToArrayLayoutProps,
  mapStateToControlProps,
  mapStateToJsonFormsRendererProps,
  mapStateToLayoutProps,
  mapStateToOneOfProps,
  mapStateToMultiEnumControlProps,
  mapDispatchToMultiEnumProps
} from '../../src/util';
import configureStore from 'redux-mock-store';
import test from 'ava';
import { generateDefaultUISchema } from '../../src/generators';
import {
  ControlElement,
  CoreActions,
  coreReducer,
  Dispatch,
  JsonFormsCore,
  JsonFormsState,
  JsonSchema,
  JsonSchema7,
  mapStateToAnyOfProps,
  OwnPropsOfControl,
  rankWith,
  RuleEffect,
  UISchemaElement
} from '../../src';
import { ErrorObject } from 'ajv';
import { setValidationMode } from '../../lib';

const middlewares: Redux.Middleware[] = [];
const mockStore = configureStore<JsonFormsState>(middlewares);

const mockDispatch = (
  initialCore: JsonFormsCore
): [() => JsonFormsCore, Dispatch<CoreActions>] => {
  const coreContainer = { core: initialCore };
  const dispatch: Dispatch<CoreActions> = <T extends CoreActions> (action: T) : T => {
    coreContainer.core = coreReducer(coreContainer.core, action);
    return action;
  };
  const getCore = () => coreContainer.core;
  return [getCore, dispatch];
};

const hideRule = {
  effect: RuleEffect.HIDE,
  condition: {
    type: 'LEAF',
    scope: '#/properties/firstName',
    expectedValue: 'Homer'
  }
};

const disableRule = {
  effect: RuleEffect.DISABLE,
  condition: {
    type: 'LEAF',
    scope: '#/properties/firstName',
    expectedValue: 'Homer'
  }
};

const enableRule = {
  effect: RuleEffect.ENABLE,
  condition: {
    type: 'LEAF',
    scope: '#/properties/firstName',
    expectedValue: 'Homer'
  }
};

const coreUISchema: ControlElement = {
  type: 'Control',
  scope: '#/properties/firstName'
};

const createState = (uischema: UISchemaElement) => ({
  jsonforms: {
    core: {
      schema: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' }
        }
      },
      data: {
        firstName: 'Homer'
      },
      uischema,
      errors: [] as ErrorObject[]
    }
  }
});

test('mapStateToControlProps - visible via ownProps ', t => {
  const uischema = {
    ...coreUISchema,
    rule: hideRule
  };
  const ownProps = {
    visible: true,
    uischema
  };
  const props = mapStateToControlProps(createState(uischema), ownProps);
  t.false(props.visible);
});

test('mapStateToControlProps - hidden via ownProps ', t => {
  const uischema = {
    ...coreUISchema,
    rule: hideRule
  };
  const ownProps = {
    visible: false,
    uischema
  };
  const props = mapStateToControlProps(createState(uischema), ownProps);
  t.false(props.visible);
});

test('mapStateToControlProps - hidden via state ', t => {
  const uischema = {
    ...coreUISchema,
    rule: hideRule
  };
  const ownProps = {
    uischema
  };
  const props = mapStateToControlProps(createState(uischema), ownProps);
  t.false(props.visible);
});

test('mapStateToControlProps - visible via state ', t => {
  const uischema = {
    ...coreUISchema,
    rule: hideRule
  };
  const ownProps = {
    uischema
  };
  const clonedState = _.cloneDeep(createState(uischema));
  clonedState.jsonforms.core.data.firstName = 'Lisa';
  const props = mapStateToControlProps(clonedState, ownProps);
  t.true(props.visible);
});

test('mapStateToControlProps - visible via state with path from ownProps ', t => {
  const uischema = {
    ...coreUISchema,
    rule: hideRule
  };
  const ownProps = {
    uischema,
    path: 'foo'
  };
  const state = {
    jsonforms: {
      core: {
        schema: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        },
        data: {
          foo: { firstName: 'Lisa' }
        },
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };
  const props = mapStateToControlProps(state, ownProps);
  t.true(props.visible);
});

test('mapStateToControlProps - disabled via global readonly', t => {
  const ownProps = {
    uischema: coreUISchema
  };
  const state: JsonFormsState = createState(coreUISchema);
  state.jsonforms.readonly = true;

  const props = mapStateToControlProps(state, ownProps);
  t.false(props.enabled);
});

test('mapStateToControlProps - disabled via global readonly beats enabled via ownProps', t => {
  const ownProps = {
    uischema: coreUISchema,
    enabled: true
  };
  const state: JsonFormsState = createState(coreUISchema);
  state.jsonforms.readonly = true;

  const props = mapStateToControlProps(state, ownProps);
  t.false(props.enabled);
});

test('mapStateToControlProps - disabled via global readonly beats enabled via rule', t => {
  const uischema = {
    ...coreUISchema,
    rule: enableRule
  };
  const ownProps = {
    uischema
  };
  const state: JsonFormsState = createState(uischema);
  state.jsonforms.readonly = true;

  const props = mapStateToControlProps(state, ownProps);
  t.false(props.enabled);
});

test('mapStateToControlProps - enabled via state with path from ownProps ', t => {
  const uischema = {
    ...coreUISchema,
    rule: disableRule
  };
  const ownProps = {
    visible: true,
    uischema,
    path: 'foo'
  };
  const state = {
    jsonforms: {
      core: {
        schema: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        },
        data: {
          foo: { firstName: 'Lisa' }
        },
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };
  const props = mapStateToControlProps(state, ownProps);
  t.true(props.enabled);
});

test('mapStateToControlProps - enabled via ownProps ', t => {
  const uischema = {
    ...coreUISchema,
    rule: disableRule
  };
  const ownProps = {
    enabled: true,
    uischema
  };
  const props = mapStateToControlProps(createState(uischema), ownProps);
  t.false(props.enabled);
});

test('mapStateToControlProps - disabled via ownProps ', t => {
  const uischema = {
    ...coreUISchema,
    rule: disableRule
  };
  const ownProps = {
    enabled: false,
    uischema
  };
  const props = mapStateToControlProps(createState(uischema), ownProps);
  t.false(props.enabled);
});

test('mapStateToControlProps - disabled via state ', t => {
  const uischema = {
    ...coreUISchema,
    rule: disableRule
  };
  const ownProps = {
    uischema
  };
  const props = mapStateToControlProps(createState(uischema), ownProps);
  t.false(props.enabled);
});

test('mapStateToControlProps - enabled via state ', t => {
  const uischema = {
    ...coreUISchema,
    rule: disableRule
  };
  const ownProps = {
    uischema
  };
  const clonedState = _.cloneDeep(createState(uischema));
  clonedState.jsonforms.core.data.firstName = 'Lisa';
  const props = mapStateToControlProps(clonedState, ownProps);
  t.true(props.enabled);
});

test('mapStateToControlProps - path', t => {
  const ownProps = {
    uischema: coreUISchema
  };
  const props = mapStateToControlProps(createState(coreUISchema), ownProps);
  t.is(props.path, 'firstName');
});

test('mapStateToControlProps - compose path with ownProps.path', t => {
  const ownProps = {
    uischema: coreUISchema,
    path: 'yo'
  };
  const props = mapStateToControlProps(createState(coreUISchema), ownProps);
  t.is(props.path, 'yo.firstName');
});

test('mapStateToControlProps - derive label', t => {
  const ownProps = {
    uischema: coreUISchema
  };
  const props = mapStateToControlProps(createState(coreUISchema), ownProps);
  t.is(props.label, 'First Name');
});

test('mapStateToControlProps - do not show label', t => {
  const ownProps = {
    uischema: {
      ...coreUISchema,
      label: {
        show: false
      }
    }
  };
  const props = mapStateToControlProps(createState(coreUISchema), ownProps);
  t.is(props.label, '');
});

test('mapStateToControlProps - data', t => {
  const ownProps = {
    uischema: coreUISchema
  };
  const props = mapStateToControlProps(createState(coreUISchema), ownProps);
  t.is(props.data, 'Homer');
});

test('mapStateToControlProps - errors', t => {
  const ownProps = {
    uischema: coreUISchema
  };
  const clonedState = _.cloneDeep(createState(coreUISchema));
  const error: ErrorObject = {
    dataPath: 'firstName',
    message: 'Duff beer',
    keyword: 'whatever',
    schemaPath: '',
    params: undefined,
    parentSchema: { type: 'string' }
  };
  clonedState.jsonforms.core.errors = [error];
  const props = mapStateToControlProps(clonedState, ownProps);
  t.is(props.errors, 'Duff beer');
});

test('mapStateToControlProps - no duplicate error messages', t => {
  const schema = {
    type: 'object',
    properties: {
      firstName: {
        anyOf: [
          { type: 'string', minLength: 5 },
          { type: 'string', enum: ['foo', 'bar'] }
        ]
      }
    }
  };
  const initCoreState = coreReducer(undefined, init({}, schema, coreUISchema));
  const updateCoreState = coreReducer(
    initCoreState,
    update('firstName', () => true)
  );
  const props = mapStateToControlProps(
    { jsonforms: { core: updateCoreState } },
    { uischema: coreUISchema }
  );
  t.is(props.errors.split('\n').length, 1);
});

test('mapStateToControlProps - id', t => {
  clearAllIds();
  const ownProps = {
    uischema: coreUISchema,
    id: '#/properties/firstName'
  };
  const props = mapStateToControlProps(createState(coreUISchema), ownProps);
  t.is(props.id, '#/properties/firstName');
});

test('mapStateToControlProps - hide errors in hide validation mode', t => {
  const schema = {
    type: 'object',
    properties: {
      animal: {
        type: 'string'
      }
    }
  };
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#/properties/animal'
  };
  const initCoreState = coreReducer(undefined, init({ animal: 100 }, schema, uischema));
  t.is(initCoreState.errors.length, 1);

  const ownProps = {
    uischema
  };
  const props = mapStateToControlProps(
    { jsonforms: { core: initCoreState } },
    ownProps
  );
  t.not(props.errors.length, 0);

  const hideErrorsState = coreReducer(
    initCoreState,
    setValidationMode('ValidateAndHide')
  );
  t.is(hideErrorsState.errors.length, 1);

  const hideErrorsProps = mapStateToControlProps(
    { jsonforms: { core: hideErrorsState } },
    ownProps
  );
  t.is(hideErrorsProps.errors, '');
});

test('mapDispatchToControlProps', t => {
  const store = mockStore(createState(coreUISchema));
  const props = mapDispatchToControlProps(store.dispatch);
  props.handleChange('foo', 42);
  const updateAction = _.head<any>(store.getActions()) as UpdateAction;
  t.is(updateAction.type, UPDATE_DATA);
  t.is(updateAction.path, 'foo');
  t.is(updateAction.updater(), 42);
});

test('createDefaultValue', t => {
  t.true(
    _.isDate(
      createDefaultValue({
        type: 'string',
        format: 'date'
      })
    )
  );
  t.true(
    _.isDate(
      createDefaultValue({
        type: 'string',
        format: 'date-time'
      })
    )
  );
  t.true(
    _.isDate(
      createDefaultValue({
        type: 'string',
        format: 'time'
      })
    )
  );
  t.is(createDefaultValue({ type: 'string' }), '');
  t.is(createDefaultValue({ type: 'number' }), 0);
  t.falsy(createDefaultValue({ type: 'boolean' }));
  t.is(createDefaultValue({ type: 'integer' }), 0);
  t.deepEqual(createDefaultValue({ type: 'array' }), []);
  t.is(createDefaultValue({ type: 'null' }), null);
  t.deepEqual(createDefaultValue({ type: 'object' }), {});
  t.deepEqual(createDefaultValue({ type: 'something' }), {});
});

test(`mapStateToDispatchRendererProps should generate UI schema given ownProps schema`, t => {
  const store = mockStore(createState(coreUISchema));
  const schema = {
    type: 'object',
    properties: {
      bar: {
        type: 'number'
      }
    }
  };

  const props = mapStateToJsonFormsRendererProps(store.getState(), { schema });
  t.deepEqual(props.uischema, generateDefaultUISchema(schema));
});

test(`mapStateToDispatchRendererProps should use registered UI schema given no ownProps`, t => {
  const store = mockStore(createState(coreUISchema));
  const props = mapStateToJsonFormsRendererProps(store.getState(), {});
  t.deepEqual(props.uischema, coreUISchema);
});

test(`mapStateToDispatchRendererProps should use UI schema if given via ownProps`, t => {
  const store = mockStore(createState(coreUISchema));
  const schema = {
    type: 'object',
    properties: {
      foo: {
        type: 'string'
      },
      bar: {
        type: 'number'
      }
    }
  };
  const uischema = {
    type: 'Control',
    scope: '#/properties/foo'
  };

  const props = mapStateToJsonFormsRendererProps(store.getState(), {
    schema,
    uischema
  });
  t.deepEqual(props.uischema, uischema);
});

test('mapDispatchToArrayControlProps should adding items to array', t => {
  const data: any = ['foo'];
  const schema: JsonSchema = {
    type: 'array',
    items: {
      type: 'string'
    }
  };
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#'
  };
  const initCore: JsonFormsCore = {
    uischema,
    schema,
    data,
    errors: [] as ErrorObject[]
  };
  const [getCore, dispatch] = mockDispatch(initCore);
  dispatch(init(data, schema, uischema));
  const props = mapDispatchToArrayControlProps(dispatch);
  props.addItem('', createDefaultValue(schema))();
  t.is(getCore().data.length, 2);
});

test('mapDispatchToArrayControlProps should remove items from array', t => {
  const data = ['foo', 'bar', 'quux'];
  const schema: JsonSchema = {
    type: 'array',
    items: {
      type: 'string'
    }
  };
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#'
  };
  const initCore: JsonFormsCore = {
    uischema,
    schema,
    data,
    errors: [] as ErrorObject[]
  };
  const [getCore, dispatch] = mockDispatch(initCore);
  dispatch(init(data, schema, uischema));
  const props = mapDispatchToArrayControlProps(dispatch);
  props.removeItems('', [0, 1])();
  t.is(getCore().data.length, 1);
  t.is(getCore().data[0], 'quux');
});

test('mapStateToLayoutProps - visible via state with path from ownProps ', t => {
  const uischema = {
    type: 'VerticalLayout',
    elements: [coreUISchema],
    rule: hideRule
  };
  const ownProps = {
    uischema,
    path: 'foo'
  };
  const state = {
    jsonforms: {
      core: {
        schema: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        },
        data: {
          foo: { firstName: 'Lisa' }
        },
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };
  const props = mapStateToLayoutProps(state, ownProps);
  t.true(props.visible);
});

test('mapStateToArrayLayoutProps - should include minItems in array layout props', t => {
  const schema: JsonSchema = {
    type: 'array',
    minItems: 42,
    items: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          default: 'foo'
        }
      }
    }
  };

  const uischema: ControlElement = {
    type: 'Control',
    scope: '#'
  };

  const state = {
    jsonforms: {
      core: {
        schema,
        data: {},
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };

  const ownProps = {
    uischema
  };

  const props = mapStateToArrayLayoutProps(state, ownProps);
  t.is(props.minItems, 42);
});

test('mapStateToLayoutProps should return renderers prop via ownProps', t => {
  const uischema = {
    type: 'VerticalLayout',
    elements: [] as UISchemaElement[]
  };
  const state = {
    jsonforms: {
      core: {
        schema: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        },
        data: {
          foo: { firstName: 'Homer' }
        },
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };
  const props = mapStateToLayoutProps(state, {
    uischema,
    path: 'foo',
    renderers: [
      {
        tester: rankWith(1, () => true),
        renderer: undefined
      }
    ]
  });
  t.is(props.renderers.length, 1);
});

test('mapStateToLayoutProps - disabled via global readonly', t => {
  const uischema = {
    type: 'VerticalLayout',
    elements: [coreUISchema],
  };
  const ownProps = {
    uischema
  };
  const state: JsonFormsState = createState(uischema);
  state.jsonforms.readonly = true;

  const props = mapStateToLayoutProps(state, ownProps);
  t.false(props.enabled);
});

test('mapStateToLayoutProps - disabled via global readonly beats enabled via ownProps', t => {
  const uischema = {
    type: 'VerticalLayout',
    elements: [coreUISchema],
  };
  const ownProps = {
    uischema,
    enabled: true
  };
  const state: JsonFormsState = createState(uischema);
  state.jsonforms.readonly = true;

  const props = mapStateToLayoutProps(state, ownProps);
  t.false(props.enabled);
});

test('mapStateToLayoutProps - disabled via global readonly beats enabled via rule', t => {
  const uischema = {
    type: 'VerticalLayout',
    elements: [coreUISchema],
    rule: enableRule
  };
  const ownProps = {
    uischema
  };
  const state: JsonFormsState = createState(uischema);
  state.jsonforms.readonly = true;

  const props = mapStateToLayoutProps(state, ownProps);
  t.false(props.enabled);
});

test('mapStateToLayoutProps - hidden via state with path from ownProps ', t => {
  const uischema = {
    type: 'VerticalLayout',
    elements: [coreUISchema],
    rule: hideRule
  };
  const ownProps = {
    uischema,
    path: 'foo'
  };
  const state = {
    jsonforms: {
      core: {
        schema: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        },
        data: {
          foo: { firstName: 'Homer' }
        },
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };
  const props = mapStateToLayoutProps(state, ownProps);
  t.false(props.visible);
});

test("mapStateToOneOfProps - indexOfFittingSchema should not select schema if enum doesn't match", t => {
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#/properties/method'
  };

  const ownProps = {
    uischema
  };

  const state = {
    jsonforms: {
      core: {
        ajv: createAjv(),
        schema: {
          type: 'object',
          properties: {
            method: {
              oneOf: [
                {
                  title: 'Injection',
                  type: 'object',
                  properties: {
                    method: {
                      title: 'Method',
                      type: 'string',
                      enum: ['Injection'],
                      default: 'Injection'
                    }
                  },
                  required: ['method']
                },
                {
                  title: 'Infusion',
                  type: 'object',
                  properties: {
                    method: {
                      title: 'Method',
                      type: 'string',
                      enum: ['Infusion'],
                      default: 'Infusion'
                    }
                  },
                  required: ['method']
                }
              ]
            }
          }
        },
        data: {
          method: {
            method: 'Infusion'
          }
        },
        uischema
      }
    }
  };

  const oneOfProps = mapStateToOneOfProps(state, ownProps);
  t.is(oneOfProps.indexOfFittingSchema, 1);
});

test('mapStateToMultiEnumControlProps - oneOf items', t => {
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#/properties/colors'
  };
  const state = {
    jsonforms: {
      core: {
        schema: {
          type: 'object',
          properties: {
            colors: {
              type: 'array',
              items: {
                oneOf: [
                  {
                    const: 'red'
                  },
                  {
                    const: 'pink',
                    title: 'almost red'
                  }
                ]
              },
              uniqueItems: true
            }
          }
        },
        data: {},
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };
  const ownProps = {
    uischema,
    path: 'colors'
  };
  const props = mapStateToMultiEnumControlProps(state, ownProps);
  t.deepEqual(props.options, [
    { label: 'red', value: 'red' },
    { label: 'almost red', value: 'pink' }
  ]);
});

test('mapStateToMultiEnumControlProps - enum items', t => {
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#/properties/colors'
  };
  const state = {
    jsonforms: {
      core: {
        schema: {
          type: 'object',
          properties: {
            colors: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['red', 'green', 'pink']
              },
              uniqueItems: true
            }
          }
        },
        data: {},
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };
  const ownProps = {
    uischema,
    path: 'colors'
  };
  const props = mapStateToMultiEnumControlProps(state, ownProps);
  t.deepEqual(props.options, [
    { label: 'red', value: 'red' },
    { label: 'green', value: 'green' },
    { label: 'pink', value: 'pink' }
  ]);
});

test('mapDispatchToMultiEnumProps - enum schema - addItem', t => {
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#/properties/colors'
  };
  const schema = {
    type: 'object',
    properties: {
      colors: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['red', 'green', 'pink']
        },
        uniqueItems: true
      }
    }
  };
  const data = {colors:['green']};
  const initCore : JsonFormsCore = {
    uischema,
    schema,
    data,
    errors: [] as ErrorObject[]
  };
  const [getCore, dispatch] = mockDispatch(initCore);
  dispatch(init(data, schema, uischema, createAjv({ useDefaults: true })));
  const props = mapDispatchToMultiEnumProps(dispatch);
  props.addItem('colors', 'pink');

  t.is(getCore().data.colors.length, 2);
  t.deepEqual(getCore().data.colors[0], 'green');
  t.deepEqual(getCore().data.colors[1], 'pink');
});

test('mapDispatchToMultiEnumProps - enum schema - removeItem', t => {
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#/properties/colors'
  };
  const schema = {
    type: 'object',
    properties: {
      colors: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['red', 'green', 'pink']
        },
        uniqueItems: true
      }
    }
  };
  const data = {colors:['green', 'red']};
  const initCore : JsonFormsCore = {
    uischema,
    schema,
    data,
    errors: [] as ErrorObject[]
  };
  const [getCore, dispatch] = mockDispatch(initCore);
  dispatch(init(data, schema, uischema, createAjv({ useDefaults: true })));
  const props = mapDispatchToMultiEnumProps(dispatch);
  props.removeItem('colors', 'red');

  t.is(getCore().data.colors.length, 1);
  t.deepEqual(getCore().data.colors[0], 'green');
});

test('mapDispatchToMultiEnumProps - oneOf schema - addItem', t => {
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#/properties/colors'
  };
  const schema = {
    type: 'object',
    properties: {
      colors: {
        type: 'array',
        items: {
          oneOf: [
            {
              const: 'red'
            },
            {
              const: 'pink',
              title: 'almost red'
            }
          ]
        },
        uniqueItems: true
      }
    }
  };
  const data = {};
  const initCore : JsonFormsCore = {
    uischema,
    schema,
    data,
    errors: [] as ErrorObject[]
  };
  const [getCore, dispatch] = mockDispatch(initCore);
  dispatch(init(data, schema, uischema, createAjv({ useDefaults: true })));
  const props = mapDispatchToMultiEnumProps(dispatch);
  props.addItem('colors', 'pink');

  t.is(getCore().data.colors.length, 1);
  t.deepEqual(getCore().data.colors[0], 'pink');
});

test('mapDispatchToMultiEnumProps - oneOf schema - removeItem', t => {
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#/properties/colors'
  };
  const schema = {
    type: 'object',
    properties: {
      colors: {
        type: 'array',
        items: {
          oneOf: [
            {
              const: 'red'
            },
            {
              const: 'pink',
              title: 'almost red'
            }
          ]
        },
        uniqueItems: true
      }
    }
  };
  const data = {colors:['pink']};
  const initCore : JsonFormsCore = {
    uischema,
    schema,
    data,
    errors: [] as ErrorObject[]
  };
  const [getCore, dispatch] = mockDispatch(initCore);
  dispatch(init(data, schema, uischema, createAjv({ useDefaults: true })));
  const props = mapDispatchToMultiEnumProps(dispatch);
  props.removeItem('colors', 'pink');

  t.is(getCore().data.colors.length, 0);
});

test('should assign defaults to enum', t => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1
      },
      color: {
        type: 'string',
        enum: ['red', 'green', 'blue'],
        default: 'green'
      }
    }
  };

  const uischema: UISchemaElement = undefined;

  const data = {
    name: 'foo'
  };

  const initState: JsonFormsState = {
    jsonforms: {
      core: {
        uischema,
        schema,
        data,
        errors: [] as ErrorObject[]
      }
    }
  };
  const newCore = coreReducer(initState.jsonforms.core, init(data, schema, uischema, createAjv({ useDefaults: true })));
  t.is(newCore.data.color, 'green');
});

test('should assign defaults to empty item within nested object of an array', t => {
  const schema: JsonSchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          default: 'foo'
        }
      }
    }
  };

  const uischema: ControlElement = {
    type: 'Control',
    scope: '#'
  };

  const data = [{}];

  const initState: JsonFormsState = {
    jsonforms: {
      core: {
        uischema,
        schema,
        data,
        errors: [] as ErrorObject[]
      }
    }
  };

  const newCore = coreReducer(initState.jsonforms.core, init(data, schema, uischema, createAjv({ useDefaults: true })));
  t.is(newCore.data.length, 1);
  t.deepEqual(newCore.data[0], { message: 'foo' });
});

test('should assign defaults to newly added item within nested object of an array', t => {
  const schema: JsonSchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          default: 'foo'
        }
      }
    }
  };

  const uischema: ControlElement = {
    type: 'Control',
    scope: '#'
  };

  const data = [{}];

  const initCore: JsonFormsCore = {
    uischema,
    schema,
    data,
    errors: [] as ErrorObject[]
  };
  const [getCore, dispatch] = mockDispatch(initCore);
  dispatch(init(data, schema, uischema, createAjv({ useDefaults: true })));
  const props = mapDispatchToArrayControlProps(dispatch);
  props.addItem('', createDefaultValue(schema))();

  t.is(getCore().data.length, 2);
  t.deepEqual(getCore().data[0], { message: 'foo' });
});

test('computeLabel - should not edit label if not required and hideRequiredAsterisk is false', t => {
  const computedLabel = computeLabel('Test Label', false, false);
  t.is(computedLabel, 'Test Label');
});

test('computeLabel - should not edit label if not required and hideRequiredAsterisk is true', t => {
  const computedLabel = computeLabel('Test Label', false, true);
  t.is(computedLabel, 'Test Label');
});

test('computeLabel - should not edit label if required but hideRequiredAsterisk is true', t => {
  const computedLabel = computeLabel('Test Label', true, true);
  t.is(computedLabel, 'Test Label');
});

test('computeLabel - should add asterisk if required but hideRequiredAsterisk is false', t => {
  const computedLabel = computeLabel('Test Label', true, false);
  t.is(computedLabel, 'Test Label*');
});

test('mapStateToAnyOfProps - const constraint in anyOf schema should return correct indexOfFittingSchema', t => {
  const uischema: ControlElement = {
    type: 'Control',
    scope: '#'
  };
  const schema: JsonSchema7 = {
    anyOf: [
      {
        type: "object",
        properties: {
          type: {
            const: "type1"
          }
        }
      },
      {
        type: "object",
        properties: {
          type: {
            const: "type2"
          }
        }
      },
      {
        type: "object",
        properties: {
          type: {
            const: "type3"
          }
        }
      }
    ]
  };
  const ownProps: OwnPropsOfControl = {
    visible: true,
    uischema,
    path: 'foo'
  };
  const state = {
    jsonforms: {
      core: {
        ajv: createAjv(),
        schema,
        data: {
          foo: { type: "type3"}
        },
        uischema,
        errors: [] as ErrorObject[]
      }
    }
  };
  const props = mapStateToAnyOfProps(state, ownProps);
  console.log(JSON.stringify(props, null, 2));
  t.is(props.indexOfFittingSchema, 2);
});
