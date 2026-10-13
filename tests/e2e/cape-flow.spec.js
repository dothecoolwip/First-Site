const { test, expect } = require('./fixtures');
const fs = require('fs');

test('town cape follows the shoulders and the hem moves @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.me && TOWN.me.cape');

  const attachment = await game.run("(()=>{const J=TOWN.me,C=J.cape;const a=C.root.getWorldPosition(new THREE.Vector3());const bone=J.bones.spine_03||J.bones.spine_02;const old=bone.rotation.z;bone.rotation.z+=0.12;J.root.updateMatrixWorld(true);const b=C.root.getWorldPosition(new THREE.Vector3());bone.rotation.z=old;J.root.updateMatrixWorld(true);return {parent:C.root.parent===bone,shift:a.distanceTo(b),name:C.cloth.name}})()");
  expect(attachment.parent).toBe(true);
  expect(attachment.shift).toBeGreaterThan(0.005);
  expect(attachment.name).toBe('capeCloth');
  const tilt = await game.run("(()=>{const J=TOWN.me,bone=J.bones.spine_03||J.bones.spine_02,old=bone.rotation.z;J.root.updateMatrixWorld(true);const before=J.cape.root.getWorldQuaternion(new THREE.Quaternion());bone.rotation.z+=0.12;capeAnimate(J,0,0,1/60);const after=J.cape.root.getWorldQuaternion(new THREE.Quaternion());bone.rotation.z=old;J.root.updateMatrixWorld(true);return before.angleTo(after)})()");
  expect(tilt).toBeGreaterThan(0.10);

  await game.frames(25);
  const flow = await game.run("(()=>{const C=TOWN.me.cape,a=C.cloth.geometry.attributes.position.array,b=C.base,cols=C.cloth.geometry.userData.capeCols;let top=0,hem=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(i<(cols+1)*2*3)top=Math.max(top,d);if(i>a.length-(cols+1)*3)hem=Math.max(hem,d)}return {top,hem}})()");
  expect(flow.top).toBe(0);
  expect(flow.hem).toBeGreaterThan(0.002);
  const turning = await game.run("(()=>{const J=TOWN.me,C=J.cape,old=J.root.rotation.y;capeAnimate(J,0,0,1/60);J.root.rotation.y+=0.8;J.root.updateMatrixWorld(true);capeAnimate(J,0,0,1/60);const response=C.turn;for(let i=0;i<180;i++)capeAnimate(J,0,i/60,1/60);const settled=C.turn;J.root.rotation.y=old;J.root.updateMatrixWorld(true);return {response,settled,finite:Array.from(C.cloth.geometry.attributes.position.array).every(Number.isFinite)}})()");
  expect(turning.response).toBeGreaterThan(0.3);
  expect(Math.abs(turning.settled)).toBeLessThan(0.01);
  expect(turning.finite).toBe(true);
  if (process.env.CAPE_DEBUG) console.log('cape coordinates', await game.run("(()=>{const C=TOWN.me.cape,a=C.cloth.geometry.attributes.position.array,n=C.cloth.geometry.userData.capeCols,top=new THREE.Vector3().fromArray(a,n*3/2),bottom=new THREE.Vector3().fromArray(a,a.length-(n+1)*3+(n/2)*3);C.root.updateMatrixWorld(true);return {top:top.applyMatrix4(C.root.matrixWorld).toArray(),bottom:bottom.applyMatrix4(C.root.matrixWorld).toArray(),motion:[C.motionX,C.motionZ],rootQ:C.root.getWorldQuaternion(new THREE.Quaternion()).toArray()}})()"));

  if (process.env.CAPE_SCREENSHOT) {
    for (const view of ['back', 'side']) {
    const data = await page.evaluate(view => {
      const { THREE, W3, TOWN } = window.__ST, J = TOWN.me, R = W3.renderer;
      const parent = J.root.parent, position = J.root.position.clone(), rotation = J.root.rotation.clone();
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#20262a');
      scene.add(new THREE.HemisphereLight('#ffffff', '#60594f', 1.3));
      const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(-2, 4, 3); scene.add(sun);
      parent.remove(J.root); scene.add(J.root); J.root.position.set(0, 0, 0); J.root.rotation.set(0, view === 'side' ? Math.PI / 2 : Math.PI, 0);
      J.root.updateMatrixWorld(true);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
      camera.position.set(0, 1.2, 3.3); camera.lookAt(0, 1.1, 0);
      const rt = new THREE.WebGLRenderTarget(500, 500), old = R.getRenderTarget();
      R.setRenderTarget(rt); R.render(scene, camera);
      const pixels = new Uint8Array(500 * 500 * 4); R.readRenderTargetPixels(rt, 0, 0, 500, 500, pixels);
      R.setRenderTarget(old); rt.dispose();
      scene.remove(J.root); parent.add(J.root); J.root.position.copy(position); J.root.rotation.copy(rotation); J.root.updateMatrixWorld(true);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 500;
      const ctx = canvas.getContext('2d'), image = ctx.createImageData(500, 500);
      for (let y = 0; y < 500; y++) image.data.set(pixels.subarray((499 - y) * 2000, (500 - y) * 2000), y * 2000);
      ctx.putImageData(image, 0, 0); return canvas.toDataURL('image/png');
    }, view);
    fs.writeFileSync(process.env.CAPE_SCREENSHOT.replace('.png', `-${view}.png`), Buffer.from(data.split(',')[1], 'base64'));
    }
  }
});
