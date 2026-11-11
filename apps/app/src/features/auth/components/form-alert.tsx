import { AlertCircleIcon } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

type FormAlertProps = {
  title?: string;
  children: React.ReactNode;
};

export function FormAlert({ title = "Não foi possível continuar", children }: FormAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
