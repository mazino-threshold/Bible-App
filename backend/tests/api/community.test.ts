import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { deleteTestData, pool, startApi, type TestApi } from '../helpers/harness';

const P = 'test.community.';
// Test links are told apart from real ones by this URL prefix
const URL_PREFIX = 'https://example.com/test-community/';

interface Link {
  platform: string;
  title: string;
  description: string;
  buttonLabel: string;
  url: string;
}

async function insertLink(name: string, options: { sortOrder: number; active?: boolean }) {
  await pool.query(
    `INSERT INTO community_links (platform, title, description, button_label, url, sort_order, active)
     VALUES ('telegram', $1, 'A test group', 'Join', $2, $3, $4)`,
    [name, URL_PREFIX + name, options.sortOrder, options.active ?? true],
  );
}

const deleteTestLinks = () => pool.query('DELETE FROM community_links WHERE url LIKE $1', [`${URL_PREFIX}%`]);

describe('community links', () => {
  let api: TestApi;
  let token: string;

  before(async () => {
    api = await startApi();
    await deleteTestData(P);
    await deleteTestLinks();
    token = await api.signUp(`${P}ada@example.com`, 'Ada Test');
  });
  after(async () => {
    await deleteTestLinks();
    await deleteTestData(P);
    await api.close();
  });

  const mine = (links: Link[]) => links.filter((l) => l.url.startsWith(URL_PREFIX));

  it('needs a signed-in user', async () => {
    assert.equal((await api.request('GET', '/community')).status, 401);
  });

  it('lists active links in display order, leaving out inactive ones', async () => {
    await insertLink('second', { sortOrder: 2 });
    await insertLink('first', { sortOrder: 1 });
    await insertLink('retired', { sortOrder: 0, active: false });

    const res = await api.request<{ links: Link[] }>('GET', '/community', { token });
    assert.equal(res.status, 200);
    assert.deepEqual(
      mine(res.body.links).map((l) => l.title),
      ['first', 'second'],
    );
    assert.deepEqual(mine(res.body.links)[0], {
      ...mine(res.body.links)[0],
      platform: 'telegram',
      description: 'A test group',
      buttonLabel: 'Join',
      url: `${URL_PREFIX}first`,
    });
  });
});
