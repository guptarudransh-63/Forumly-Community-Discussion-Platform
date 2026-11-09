import fs from 'fs';
import path from 'path';

const target = path.resolve('node_modules/get-intrinsic/index.js');
if (fs.existsSync(target)) {
  let code = fs.readFileSync(target, 'utf8');
  if (code.includes("require('es-object-atoms')")) {
    code = code.replace("var $Object = require('es-object-atoms');", "var $Object = Object;");
    code = code.replace("var $Error = require('es-errors');", "var $Error = Error;");
    code = code.replace("var $EvalError = require('es-errors/eval');", "var $EvalError = EvalError;");
    code = code.replace("var $RangeError = require('es-errors/range');", "var $RangeError = RangeError;");
    code = code.replace("var $ReferenceError = require('es-errors/ref');", "var $ReferenceError = ReferenceError;");
    code = code.replace("var $SyntaxError = require('es-errors/syntax');", "var $SyntaxError = SyntaxError;");
    code = code.replace("var $TypeError = require('es-errors/type');", "var $TypeError = TypeError;");
    code = code.replace("var $URIError = require('es-errors/uri');", "var $URIError = URIError;");

    code = code.replace("var abs = require('math-intrinsics/abs');", "var abs = Math.abs;");
    code = code.replace("var floor = require('math-intrinsics/floor');", "var floor = Math.floor;");
    code = code.replace("var max = require('math-intrinsics/max');", "var max = Math.max;");
    code = code.replace("var min = require('math-intrinsics/min');", "var min = Math.min;");
    code = code.replace("var pow = require('math-intrinsics/pow');", "var pow = Math.pow;");
    code = code.replace("var round = require('math-intrinsics/round');", "var round = Math.round;");
    code = code.replace("var sign = require('math-intrinsics/sign');", "var sign = Math.sign;");

    code = code.replace("var getProto = require('get-proto');", "var getProto = Object.getPrototypeOf;");
    code = code.replace("var $ObjectGPO = require('get-proto/Object.getPrototypeOf');", "var $ObjectGPO = Object.getPrototypeOf;");
    code = code.replace("var $ReflectGPO = require('get-proto/Reflect.getPrototypeOf');", "var $ReflectGPO = typeof Reflect !== 'undefined' ? Reflect.getPrototypeOf : null;");
    code = code.replace("var $apply = require('call-bind-apply-helpers/functionApply');", "var $apply = Function.prototype.apply;");
    code = code.replace("var $call = require('call-bind-apply-helpers/functionCall');", "var $call = Function.prototype.call;");

    fs.writeFileSync(target, code);
    console.log('[Setup] Fast get-intrinsic patch verified.');
  }
}
