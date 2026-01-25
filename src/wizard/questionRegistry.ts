import { WizardQuestion } from './WizardController';
import { HelloQuestion } from './questions/HelloQuestion';
import { NameQuestion } from './questions/NameQuestion';
import { IntroQuestion } from './questions/IntroQuestion';
import { ThemeQuestion } from './questions/ThemeQuestion';
import { DateFormatQuestion } from './questions/DateFormatQuestion';
import { TimeFormatQuestion } from './questions/TimeFormatQuestion';
import { NumberFormatQuestion } from './questions/NumberFormatQuestion';
import { ModulesQuestion } from './questions/ModulesQuestion';
import { DatastoreQuestion } from './questions/DatastoreQuestion';
import { CompletionQuestion } from './questions/CompletionQuestion';
import { PatchNotesQuestion } from './questions/PatchNotesQuestion';

export const questionRegistry: WizardQuestion[] = [
  HelloQuestion,
  PatchNotesQuestion,
  NameQuestion,
  IntroQuestion,
  ThemeQuestion,
  DateFormatQuestion,
  TimeFormatQuestion,
  NumberFormatQuestion,
  ModulesQuestion,
  DatastoreQuestion,
  CompletionQuestion,
];
