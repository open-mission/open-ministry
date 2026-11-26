export function formatTypeName(type: string): string {
  switch (type) {
    case "assignment":
      return "Escala de Culto";
    case "announcement":
      return "Aviso da Igreja";
    case "rehearsal_reminder":
      return "Lembrete de Ensaio";
    case "welcome":
      return "Boas-vindas";
    case "reset_password":
      return "Troca de Senha";
    case "magic_link":
      return "Link Mágico";
    case "email_verification":
      return "Confirmação";
    default:
      return type;
  }
}

export function formatEmailDate(value: Date | string): string {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
