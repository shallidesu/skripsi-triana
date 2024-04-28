/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const pemiraChaincode = require('./lib/pemiraChaincode');

module.exports.PemiraChaincode = pemiraChaincode;
module.exports.contracts = [pemiraChaincode];
