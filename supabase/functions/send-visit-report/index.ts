import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { canSendVisitReport, forbidden, requireAuthenticatedRole } from "../_shared/auth.ts"
import { sendReportEmail } from "../_shared/email.ts"
import { createResendClient, createServiceClient } from "../_shared/supabase-client.ts"

const supabase = createServiceClient()
const resend = createResendClient()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })
  }

  try {
    const auth = await requireAuthenticatedRole(req, ['administrador_geral', 'administrador_mx', 'consultor_mx'])
    if (auth.response) return auth.response

    const { visitId } = await req.json()

    // 1. Buscar dados da visita e cliente
    const { data: visit, error: visitError } = await supabase
      .from('visitas_consultoria')
      .select('*, client:clientes_consultoria(*)')
      .eq('id', visitId)
      .single()

    if (visitError || !visit) throw new Error('Visita não encontrada')
    if (!(await canSendVisitReport(auth.context, visit))) {
      return forbidden('Visit report does not belong to this consultant')
    }

    // 2. Buscar contatos do cliente (para enviar o e-mail)
    const { data: contacts } = await supabase
      .from('contatos_cliente_consultoria')
      .select('email')
      .eq('client_id', visit.client_id)
      .eq('is_primary', true)

    const recipientEmails = contacts?.map(c => c.email).filter(Boolean) || []
    if (recipientEmails.length === 0) {
      return new Response(JSON.stringify({
        message: 'Nenhum contato primário com e-mail encontrado',
        email: { status: 'not_sent', warnings: ['Nenhum destinatario configurado'] },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 3. Template HTML simplificado (enquanto não geramos PDF no server)
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #0D3B2E;">Relatório de Visita MX Performance</h2>
        <p>Olá, o relatório da <strong>Visita ${visit.visit_number}</strong> para a loja <strong>${visit.client.name}</strong> já está disponível.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p><strong>Resumo Executivo:</strong></p>
        <blockquote style="font-style: italic; color: #666;">${visit.executive_summary || 'Nenhum relato inserido.'}</blockquote>
        <p><strong>Status:</strong> ${visit.status.toUpperCase()}</p>
        <p><strong>Data:</strong> ${new Date(visit.effective_visit_date || visit.scheduled_at).toLocaleDateString('pt-BR')}</p>
        <br />
        <a href="${Deno.env.get('APP_URL') || 'https://www.mxperformance.com.br'}/consultoria/clientes/${visit.client.slug}/visitas/${visit.visit_number}" 
           style="background-color: #0D3B2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          VER RELATÓRIO COMPLETO NO CRM
        </a>
        <p style="font-size: 10px; color: #999; margin-top: 40px;">Este é um e-mail automático. Não responda.</p>
      </div>
    `

    // 4. Enviar via Resend
    const email = await sendReportEmail({
      resend,
      to: recipientEmails,
      subject: `Relatório de Visita: ${visit.client.name} (Visita ${visit.visit_number})`,
      html,
      logPrefix: '[VisitReport]',
      storeName: visit.client.name,
    })

    return new Response(JSON.stringify({
      success: email.status === 'sent',
      email,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: email.status === 'failed' ? 502 : 200
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
