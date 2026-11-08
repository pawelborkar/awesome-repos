import {test,expect} from '@playwright/test';
import {loadCatalog} from '../../scripts/catalog.mjs';
const catalog=loadCatalog();
const hasApprovedComparison=catalog.collections.some(c=>c.slug==='ai-for-beginners' && c.reviewed && c.comparison.length>0);

test('discovery paths connect homepage, collection, repository and parent guide',async({page})=>{
  await page.goto('/');
  await expect(page.locator('main')).not.toContainText('open-source repositories');
  await page.getByRole('region',{name:'Find a resource for your next step'}).getByRole('link',{name:/Python/}).click();
  await expect(page).toHaveURL('/discover/python-practice/');
  await page.locator('.directory').getByRole('link',{name:'Learn Python',exact:true}).click();
  await expect(page).toHaveURL('/repositories/trekhleb/learn-python/');
  const next=page.getByRole('region',{name:'Choose your next step'});
  await expect(next.getByRole('link',{name:/Python/})).toHaveAttribute('href','/discover/python-practice/');
});

test('reference asset publication follows its review status',async({request})=>{
  const approved=catalog.collections.some(c=>c.slug==='choosing-github-learning-resources' && c.reviewed && c.indexable);
  const response=await request.get('/discover/choosing-github-learning-resources/');
  expect(response.status()).toBe(approved?200:404);
});

test('approved comparison content works without JavaScript and stays within the viewport',async({browser,baseURL})=>{
  test.skip(!hasApprovedComparison,'Requires an approved comparison or the isolated approved-content fixture.');
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();
  try{
    await page.goto(baseURL+'/discover/ai-for-beginners/');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(6);
    await expect(page.getByRole('heading',{name:'Questions before choosing'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('link',{name:'AI Agents for Beginners: source 1'}).evaluate((el:HTMLAnchorElement)=>el.getAttribute('href')).then(href=>expect(href).toBe('https://github.com/microsoft/ai-agents-for-beginners'));
    await page.screenshot({path:'reports/seo-comparison-mobile.png',fullPage:true});
  }finally{await context.close()}
});

test('approved category and reference content remains usable on mobile without JavaScript',async({browser,baseURL})=>{
  const categoryPaths=['ai-agents','ai-tools','productivity-tools'].filter(slug=>catalog.categories.some(c=>c.slug===slug && c.editorial?.reviewed)).map(slug=>`/categories/${slug}/`);
  const guidePaths=['command-line-workflow','machine-learning-deeper','developer-learning-paths','choosing-github-learning-resources'].filter(slug=>catalog.collections.some(c=>c.slug===slug&&c.reviewed&&c.indexable)).map(slug=>`/discover/${slug}/`);
  test.skip(categoryPaths.length+guidePaths.length===0,'No approved second-batch pages in this checkout.');
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();
  try{
    for(const path of [...categoryPaths,...guidePaths]){
      expect((await page.goto(baseURL+path))?.status()).toBe(200);
      await expect(page.getByRole('heading',{level:1})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBe(true);
    }
  }finally{await context.close()}
});
