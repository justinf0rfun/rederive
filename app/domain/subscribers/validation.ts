export function validateSubscriberEmail(email: string): string | null {
  const value = email.trim();
  if (!value) {
    return "请输入邮箱。";
  }

  if (value.length > 254) {
    return "邮箱太长。";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "请输入有效邮箱。";
  }

  return null;
}
