import type { GlaziaSupabaseClient } from '../supabase/supabase.service';
import {
  CreateLancamentoDto,
  StatusLancamento,
  TipoLancamento,
} from './dto/create-lancamento.dto';
import { LancamentosService } from './lancamentos.service';

describe('LancamentosService', () => {
  it('always injects empresaId from the secure context', async () => {
    const payloads: Array<Record<string, unknown>> = [];
    const chain = {
      insert: jest.fn(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'launch-id' },
        error: null,
      }),
    };
    chain.insert.mockImplementation((payload: Record<string, unknown>) => {
      payloads.push(payload);
      return chain;
    });
    const client = {
      from: jest.fn().mockReturnValue(chain),
    } as unknown as GlaziaSupabaseClient;
    const service = new LancamentosService();
    const dto = {
      tipo: TipoLancamento.ENTRADA,
      idCliente: '11111111-1111-4111-8111-111111111111',
      descricao: 'Venda',
      valor: '1500.00',
      dataLancamento: '2026-07-18',
      status: StatusLancamento.REALIZADO,
      id_empresa: 'empresa-maliciosa',
    } as CreateLancamentoDto & { id_empresa: string };

    await service.criar(client, 'empresa-a', dto);
    await service.criar(client, 'empresa-b', dto);

    expect(payloads[0]).toEqual(
      expect.objectContaining({ id_empresa: 'empresa-a' }),
    );
    expect(payloads[1]).toEqual(
      expect.objectContaining({ id_empresa: 'empresa-b' }),
    );
    expect(payloads).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id_empresa: 'empresa-maliciosa' }),
      ]),
    );
  });
});
