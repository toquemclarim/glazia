import { mesAtualComercial, periodoDoMes } from './periodo';

describe('periodo comercial', () => {
  it('dia 1 cobre o mês civil', () => {
    expect(periodoDoMes('2026-03', 1)).toMatchObject({
      mesInicio: '2026-03-01',
      mesFim: '2026-04-01',
      fim: '2026-03-31',
    });
  });

  it('dia 10 vai até o dia 9 do mês seguinte', () => {
    expect(periodoDoMes('2026-03', 10)).toMatchObject({
      mesInicio: '2026-03-10',
      mesFim: '2026-04-10',
      fim: '2026-04-09',
    });
  });

  it('dia 15 em dezembro atravessa o ano', () => {
    expect(periodoDoMes('2026-12', 15)).toMatchObject({
      mesInicio: '2026-12-15',
      mesFim: '2027-01-15',
      fim: '2027-01-14',
    });
  });

  it('antes do dia de corte o mês atual ainda é o anterior', () => {
    const agora = new Date(Date.UTC(2026, 10, 2));
    expect(mesAtualComercial(10, agora)).toBe('2026-10');
    expect(mesAtualComercial(1, agora)).toBe('2026-11');
  });

  it('no dia de corte o mês atual é o do calendário', () => {
    const agora = new Date(Date.UTC(2026, 10, 10));
    expect(mesAtualComercial(10, agora)).toBe('2026-11');
  });
});
