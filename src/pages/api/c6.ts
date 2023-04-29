// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { data } from 'autoprefixer'
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../../lib/mongodb'

type Data = {
  sucesso: boolean,
  mensagem?: string
}

type Proposta = {
  "CPF": string,
  "CONTRATOS": number,
  "ATIVO": boolean,
  "ITENS": [
    {
      "NUMERO": string,
      "VALOR DO EMPRÉSTIMO": number,
      "VALOR DA PARCELA": number,
      "QUANTIDADE DE PARCELAS": number,
      "STATUS ATUAL": string,
      "DATA DA PRIMEIRA PARCELA": Date
    }]
}

async function limpar(mensagem: string): Promise<string> {
  return mensagem
    .replace("você tem as seguintes propostas:", "")
    .replace("1: encerrar chat\n", "").trim()
    .replace("2: nova pergunta\n", "").trim()
    .replace("3: cancelar proposta\n", "").trim()
    .replace("4: especialista", "").trim()
    .replace(/\n\n/g, "");
};
async function fatiar(mensagem: string) {
  return mensagem.split("\n")
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {

  const { method } = req
  try {
    const client = await clientPromise
    const db = client.db("corretora")
    let data: {};
    let status: boolean = false;
    switch (method) {
      case 'POST':
        try {
          const mensagem = req.body.mensagem
          if (!mensagem.includes('número')) {
            status = mensagem.includes("ativo")
            data = { "CPF": req.body.CPF, "Data": req.body.Data, "Ativo": status, "Contratos": 0, "itens": [] }
          }
          else {
            const limpa = await limpar(mensagem)
            const fatiadas = await fatiar(limpa)
            var resultado: { [key: string]: string | number | boolean | Date } = {};
            var itens: {}[] = []; // Inicializa itens como um array vazio
            var contratos = 0;
            fatiadas.forEach(function (par) {
              let [chave, valor] = par.split(':');
              switch (chave) {
                case "número":
                  resultado[chave] = parseInt(valor)
                  break;
                case "valor do empréstimo":
                  resultado[chave] = parseFloat(valor.replace("r$", ""))
                  break;
                case "valor da parcela":
                  resultado[chave] = parseFloat(valor.replace("r$", ""))
                  break;
                case "quantidade de parcelas":
                  resultado[chave] = parseInt(valor);
                  break;
                case "status atual":
                  resultado[chave] = (valor === "ativo") ? true : false;
                  if (resultado[chave]) status = resultado[chave] as boolean;
                  break;
                case "data da primeira parcela":
                  let partesData = valor.split("/");
                  let data = new Date(parseInt(partesData[2]), parseInt(partesData[1]) - 1, parseInt(partesData[0]));
                  resultado[chave] = data;
                  itens.push(resultado);
                  resultado = {};
                  contratos = contratos = + 1;
                  break;
                default:
                  break;
              }
            });
            data = { "CPF": req.body.CPF, "Data": req.body.Data, "Contratos": contratos, "Ativo": status, "itens": itens }
          }
          await db.collection("contratos").insertOne(data)
          console.log(data)
          res.status(201).json({ sucesso: true })
        } catch (error) {
          res.status(400).json({ sucesso: false })
        }
        break
      default: res.status(400).json({ sucesso: false })

        break
    }
  } catch (e) {
    res.status(400).json({ sucesso: false })
  }


}
