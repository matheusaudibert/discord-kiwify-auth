import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const WEBHOOK_URL = process.env.WEBHOOK_DISCORD;
const payload = {
  components: [
    {
      type: 17,
      accent_color: 1761741,
      spoiler: false,
      components: [
        {
          type: 12,
          items: [
            {
              media: {
                url: "https://i.postimg.cc/wBb5cSh6/acelera-dev-banner.jpg"
              },
              description: null,
              spoiler: false
            }
          ]
        },
        {
          type: 10,
          content: "# Bem-vindo(a) ao Acelera Dev"
        },
        {
          type: 10,
          content:
            "Se você chegou até aqui, é porque decidiu dar o próximo passo rumo à sua vaga na área de tecnologia, **e isso já te coloca na frente da maioria.**"
        },
        {
          type: 10,
          content:
            "Aqui dentro, você vai ter acesso ao método que já ajudou devs iniciantes e travados a finalmente conquistar entrevistas, chamadas e oportunidades reais, mesmo começando do zero ou sem experiência."
        },
        {
          type: 10,
          content:
            "**O que te espera dentro da comunidade:**\n- **Currículo** que realmente chama atenção\n- **LinkedIn** otimizado para atrair recrutadores;\n- Preparação prática para **entrevistas** de RH e técnicas;\n- Organização dos **processos seletivos** sem bagunça, sem ansiedade;\n- Passo a passo claro de **como entrar no mercado tech mais rápido**."
        },
        {
          type: 10,
          content:
            "Além disso, você fará parte de uma comunidade exclusiva, com pessoas que têm o mesmo objetivo que você, **e isso acelera MUITO sua evolução**."
        }
      ]
    },
    {
      type: 17,
      accent_color: 1761741,
      spoiler: false,
      components: [
        {
          type: 10,
          content: "# Como liberar seu acesso ao servidor?"
        },
        {
          type: 10,
          content:
            "Para obter acesso completo ao servidor, basta:\n- Acesse o canal **<#1445619259022774365>** logo abaixo;\n- Clique em **Verificar e-mail**;\n- Digite o **mesmo e-mail** utilizado na sua inscrição para liberar do **Acelera Dev**."
        },
        {
          type: 10,
          content: "Se ainda não fez sua inscrição, **clique no botão abaixo**."
        },
        {
          type: 10,
          content: "-# @everyone"
        }
      ]
    },
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "Faça sua inscrição aqui",
          emoji: null,
          disabled: false,
          url: "https://aceleradev.com.br/"
        }
      ]
    }
  ],
  flags: 32768
};

async function sendWebhook() {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log("Mensagem enviada com sucesso.");
    } else {
      console.error("Falha ao enviar mensagem:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Erro ao enviar webhook:", err);
  }
}

sendWebhook();
