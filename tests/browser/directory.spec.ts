import {test,expect} from '@playwright/test';
test('home, navigation, themes, and responsive layout',async({page},testInfo)=>{
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toHaveText('All repositories');
 const before=await page.locator('html').getAttribute('data-theme');await page.getByRole('button',{name:'Switch color theme'}).click();const theme=await page.locator('html').getAttribute('data-theme');expect(theme).not.toBe(before);await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme',theme!);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`reports/${testInfo.project.name}-home.png`,fullPage:false});
 if(testInfo.project.name==='mobile'){await page.locator('.mobile-menu summary').click();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Learn',exact:true}).click();}else await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Learn',exact:true}).click();await expect(page).toHaveURL(/\/learn\//);
});
test('filters persist in fragment and show empty state',async({page})=>{
 await page.goto('/learn/');await page.locator('select[name="category"]').selectOption('rust');await expect(page).toHaveURL(/#category=rust/);
 await expect(page.locator('[data-resource]:visible')).not.toHaveCount(0);await page.reload();await expect(page.locator('select[name="category"]')).toHaveValue('rust');
 await page.getByRole('button',{name:'Reset'}).click();await expect(page).toHaveURL('/learn/');
});
test('Pagefind searches all resources, filters and sorts',async({page})=>{
 await page.goto('/search/');await page.getByRole('searchbox').fill('Rust');await expect(page.locator('#search-results li').first()).toBeVisible({timeout:15000});
 await expect(page.locator('#search-results')).toContainText('Rust');await page.locator('select[name="sort"]').selectOption('name:asc');await expect(page).toHaveURL(/sort=name/);
 await page.locator('select[name="technology"]').selectOption('Rust');await expect(page.locator('#search-results li').first()).toBeVisible();
 await page.getByRole('searchbox').fill('zzzztherearenoresources');await expect(page.locator('#search-status')).toHaveText('0 resources found');
});
test('keyboard access and detail links',async({page})=>{
 await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.keyboard.press('/');await expect(page).toHaveURL('/search/');
 await page.goto('/repositories/rust-lang/book/');await expect(page.getByRole('heading',{name:'Who it is for'})).toBeVisible();await expect(page.getByRole('link',{name:'Explore on GitHub'})).toHaveAttribute('href','https://github.com/rust-lang/book');
});
test('core catalog works without JavaScript',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(baseURL+'/categories/');await page.locator('#main').getByRole('link',{name:/^Rust/}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Rust');await expect(page.locator('[data-resource]')).not.toHaveCount(0);await context.close();
});
test('unknown route returns actual 404',async({request})=>{const response=await request.get('/definitely-not-a-page/');expect(response.status()).toBe(404);});

test('app directory supports text filtering and persistent view mode',async({page})=>{
 await page.goto('/');await page.getByRole('searchbox',{name:'Filter these resources'}).fill('ripgrep');await expect(page.locator('[data-resource]:visible')).toHaveCount(1);await expect(page).toHaveURL(/q=ripgrep/);await page.getByRole('button',{name:'Grid view'}).click();await expect(page.locator('.directory')).toHaveAttribute('data-view','grid');await page.reload();await expect(page.locator('.directory')).toHaveAttribute('data-view','grid');await expect(page.getByRole('searchbox',{name:'Filter these resources'})).toHaveValue('ripgrep');
});

test('advanced filters disclose predictably and restore active values',async({page})=>{
 await page.goto('/learn/');await expect(page.locator('[data-advanced]')).not.toHaveAttribute('open','');await page.getByText('More filters',{exact:true}).click();await page.locator('.directory select[name="technology"]').selectOption('Rust');await expect(page.locator('[data-resource]:visible')).toHaveCount(3);await page.reload();await expect(page.locator('[data-advanced]')).toHaveAttribute('open','');await expect(page.locator('.directory select[name="technology"]')).toHaveValue('Rust');
});
