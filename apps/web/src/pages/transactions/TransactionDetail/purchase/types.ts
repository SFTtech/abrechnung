import { PositionValidator } from "@abrechnung/types";
import { z } from "zod";

export type PositionValidationError = z.core.$ZodFlattenedError<z.infer<typeof PositionValidator>>;
export type ValidationErrors = {
    [positionId: number]: PositionValidationError;
};
