import { expect, type Page } from '@playwright/test';

export async function openSettings(page:Page):Promise<void>{
  const visibleSettingsTab=page.locator('nav.bottom-nav [data-view="settings"]:visible');
  if(await visibleSettingsTab.count()){
    await visibleSettingsTab.click();
  }else{
    await page.locator('nav.bottom-nav [data-view="catalogs"]:visible').click();
    const shortcut=page.locator('[data-mobile-settings-shortcut]:visible');
    await expect(shortcut).toBeVisible();
    await shortcut.click();
  }
  await expect(page.getByRole('heading',{name:'Daten und Sicherung'})).toBeVisible();
}
