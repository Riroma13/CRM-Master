// Type-level tests — verify compile-time errors for non-exported names.
// @ts-expect-error - NonExistent is not exported from index
import { NonExistent } from '../index';
void NonExistent;

import { Button } from '../index';
void Button;
