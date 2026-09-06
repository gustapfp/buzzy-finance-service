import { mailManager } from "infra/email/mailManager";
import { waitForServices } from "infra/scripts/waitForServices";
import { deleteAllEmails, getLastEmail } from "../utils";

beforeAll(async () => {
  await waitForServices();
});

describe("infra/email/mailManager", () => {
  test("sendEmail()", async () => {
    await deleteAllEmails();

    await mailManager.sendEmail({
      from: "guga <guga@buzzy.com.br>",
      to: "guga@guga.dev",
      subject: "Teste de assunto",
      text: "Teste de corpo.",
    });

    await mailManager.sendEmail({
      from: "guga <guga@buzzy.com.br>",
      to: "guga@guga.dev",
      subject: "Último email enviado",
      text: "Corpo do último email.",
    });

    const lastEmail = await getLastEmail();
    expect(lastEmail.sender).toBe("<guga@buzzy.com.br>");
    expect(lastEmail.recipients[0]).toBe("<guga@guga.dev>");
    expect(lastEmail.subject).toBe("Último email enviado");
    expect(lastEmail.text).toBe("Corpo do último email.\r\n");
  });
});
