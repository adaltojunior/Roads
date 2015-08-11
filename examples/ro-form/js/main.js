/**
 * Created by adaltojunior on 8/4/15.
 */

RoFormExample = RoFormExample || {};
RoFormExample.Controllers = RoFormExample.Controllers || {};

Ro.init(function () {
    RoApp.putViewsInFirstPosition();
    RoFormExample.Form = new RoFormExample.Controllers.Form();
});