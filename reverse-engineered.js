var __extends = this.__extends || function(e, t) {
    for (var n in t) t.hasOwnProperty(n) && (e[n] = t[n]);

    function a() {
        this.constructor = e
    }
    a.prototype = t.prototype, e.prototype = new a
};
define("scripts/RestCall", ["require", "exports", "VSS/Authentication/Services", "scripts/RestCall"], function(require, exports, vss_auth_service, rest_call) {
    exports.callApi = function(url, method, headers, data, success_callback, failure_callback) {
        VSS.getAccessToken().then(function(token) {
            var authHeader = vss_auth_service.authTokenManager.getAuthorizationHeader(token);
            $.ajax({
                url: url,
                method: method,
                data: data || "",
                success: function(data, status, xhr) {
                    success_callback(data, xhr)
                },
                error: function(xhr, status, errorThrown) {
                    void 0 !== xhr.responseJSON || !xhr.status || 401 !== xhr.status && 403 !== xhr.status ? void 0 !== xhr.responseJSON ? failure_callback(xhr.responseJSON, errorThrown, xhr.status) : failure_callback({
                        message: "call failed with status code " + xhr.status
                    }, errorThrown, xhr.status) : failure_callback({
                        message: "unauthorized call"
                    }, errorThrown)
                },
                beforeSend: function(xhr) {
                    if (xhr.setRequestHeader("Authorization", authHeader), headers)
                        for (var t in headers) xhr.setRequestHeader(t, headers[t])
                }
            })
        })
    }
}), define("scripts/ApprovalsApi", ["require", "exports", "scripts/RestCall"], function(require, exports, rest_call) {
    function c(e, t) {
        var webcontext = VSS.getWebContext();
        return t && (t = "/" + t), e = e || "", t = t || "", (-1 !== webcontext.host.authority.toLowerCase().indexOf("dev.azure.com") ? webcontext.account.uri.replace("dev.azure.com", "vsrm.dev.azure.com") : webcontext.account.uri.replace(".visualstudio.com", ".vsrm.visualstudio.com") + "DefaultCollection/") + webcontext.project.id + "/_apis/release/approvals" + t + "?api-version=4.1-preview.1" + e
    }

    function p(e) {
        return void 0 !== e ? "&continuationToken=" + e : ""
    }
    exports.getMyPendingApprovals = function i(r, s, l, e) {
        VSS.getWebContext();
        var t = c("&statusFilter=pending&top=100" + p(e));
        rest_call.callApi(t, "GET", null, null, function(e, t) {
            var n = l || "";
            if (0 === e.value.length) r(e);
            else {
                for (var a = 0; a < e.value.length; a++) n += ("" === n ? "" : ",") + e.value[a].release.id;
                var o = t.getResponseHeader("X-MS-ContinuationToken") || "";
                "" !== o ? i(r, s, n, o) : function a(o, i, r, s, e) {
                    var t = VSS.getWebContext(),
                        n = c("&top=100&includeMyGroupApprovals=true&statusFilter=pending&assignedToFilter=" + t.user.uniqueName + "&releaseIdsFilter=" + o + p(e));
                    s = s || {
                        value: []
                    }, rest_call.callApi(n, "GET", null, null, function(e, t) {
                        var n = t.getResponseHeader("X-MS-ContinuationToken") || "";
                        e.value = e.value.concat(s.value), "" !== n ? a(o, i, r, e, n) : i(e)
                    }, function(e) {
                        r(e)
                    })
                }(n = n.split(",").sort(function(e, t) {
                    return (e = parseInt(e)) === (t = parseInt(t)) ? 0 : t < e ? -1 : 1
                }).filter(function(e, t, n) {
                    return !t || e != n[t - 1]
                }).join(","), r, s)
            }
        }, function(e) {
            s(e)
        })
    }, exports.getPendingApprovals = function a(o, i, r, e) {
        var t = c("&statusFilter=pending&top=100" + p(e));
        r = r || {
            value: []
        }, rest_call.callApi(t, "GET", null, null, function(e, t) {
            var n = t.getResponseHeader("X-MS-ContinuationToken") || "";
            e.value = e.value.concat(r.value), "" !== n ? a(o, i, e, n) : o(e)
        }, function(e) {
            i(e)
        })
    }, exports.approve = function(e, t, n, a) {
        var o = c("", e);
        rest_call.callApi(o, "PATCH", {
            "Content-Type": "application/json"
        }, JSON.stringify({
            status: t ? "2" : "4"
        }), function(e) {
            n(e)
        }, function(e) {
            a(e)
        })
    }
}), define("scripts/format", ["exports"], function(e) {
    var i = [
        [60, "seconds", " ago", 1],
        [120, "1 minute", " ago"],
        [3600, "minutes", " ago", 60],
        [7200, "1 hour", " ago"],
        [86400, "hours", " ago", 3600],
        [172800, "yesterday", ""],
        [604800, "days", " ago", 86400],
        [1209600, "last week", ""],
        [2419200, "weeks", " ago", 604800],
        [4838400, "last month", ""],
        [29030400, "months", " ago", 2419200]
    ];
    e.formatTimeAgo = function(e, t) {
        void 0 === t && (t = new Date), "string" == typeof e && (e = new Date(e));
        var n = (+t - e) / 1e3;
        if (0 == n) return "just now";
        for (var a, o = 0; a = i[o++];)
            if (n < a[0]) return a.length <= 3 ? a[1] + a[2] : Math.floor(n / a[3]) + " " + a[1] + a[2];
        return 12 * (t.getFullYear() - e.getFullYear()) + (t.getMonth() - e.getMonth()) + " months ago"
    }
}), define("scripts/ApprovalsWidget", ["require", "exports", "VSS/Controls", "TFS/Dashboards/WidgetHelpers", "scripts/ApprovalsApi", "scripts/format"], function(e, t, n, f, a, r) {
    var o = function(t) {
        var c, o = a,
            s = r;

        function n(e) {
            c = e, t.call(this)
        }

        function p(e) {
            return "my-approval-" + e.replace(/\./g, "_")
        }

        function v(t, n, a) {
            var e;
            e = a ? o.getMyPendingApprovals : o.getPendingApprovals, t.empty(), $("<img src='img/spinner.gif' />").appendTo(t), e(function(e) {
                e && e.value && (e.value = e.value.sort(function(e, t) {
                        switch (n.sortBy) {
                            case "Date":
                                return (e = new Date(e.createdOn).getTime()) === (t = new Date(t.createdOn).getTime()) ? 0 : t < e ? 1 : -1;
                            case "Release":
                                return e.releaseDefinition.name === t.releaseDefinition.name ? 0 : e.releaseDefinition.name > t.releaseDefinition.name ? 1 : -1;
                            case "Environment":
                                return e.releaseEnvironment.name === t.releaseEnvironment.name ? 0 : e.releaseEnvironment.name === t.releaseEnvironment.name ? 1 : -1;
                            default:
                                throw "unknown sort"
                        }
                    })), t.empty(),
                    function(e, t, n, a) {
                        var o = VSS.getWebContext().user.uniqueName;
                        if (null == t || 0 === t.value.length) a ? e.text("You don't have releases to approve.") : e.text("No pending approvals."), l("");
                        else {
                            for (var i = t.value, r = n.enableActions, s = 0; s < i.length; s++) u(i[s], r && (i[s].approver.uniqueName == o || a)).appendTo(e);
                            l(i.length)
                        }
                    }(t, e, n, a)
            }, function(e) {
                i(e, "Error getting list of approvals")
            })
        }

        function l(e) {
            "" !== e && (e = " (" + e + ")"), $("#RMApprovalCounter").text(e)
        }

        function u(t, e) {
            var n, a, o;
            if ($itemDiv = $("<div data-id='" + t.release.id + "'></div>"), $("<a href='" + (n = t.releaseDefinition, a = t.release, o = VSS.getWebContext(), o.account.uri + "DefaultCollection/" + o.project.name + "/_apps/hub/ms.vss-releaseManagement-web.hub-explorer?_a=release-summary&definitionId=" + n.id + "&releaseId=" + a.id) + "' target='_blank' title='Approver: " + t.approver.displayName + "'>" + t.release.name + " [" + t.releaseDefinition.name + "] " + function(e) {
                    switch (e) {
                        case "preDeploy":
                            return " deploy to ";
                        case "postDeploy":
                            return " validate deploy from ";
                        default:
                            return " " + e + " to "
                    }
                }(t.approvalType) + t.releaseEnvironment.name + "</a> <span class='releaseAge'>" + s.formatTimeAgo(t.createdOn) + "</span>").appendTo($itemDiv), e) {
                var i = $("<span class='icon icon-rm-blue-check action-icon' title='Approve'/>");
                i.click(function(e) {
                    d(t.id, !0, $(e.currentTarget).parent())
                });
                var r = $("<span class='icon icon-rm-status-abandoned action-icon' title='Reject'/>");
                r.click(function(e) {
                    $(e).remove(), d(t.id, !1, $(e.currentTarget).parent())
                }), i.appendTo($itemDiv), r.appendTo($itemDiv)
            }
            return $itemDiv
        }

        function d(t, n, a) {
            e(["scripts/ApprovalsApi"], function(e) {
                e.approve(t, n, function(e) {
                    a.remove()
                }, function(e) {
                    i(e, "Error " + (n ? " approving " : " rejecting ") + " release.")
                })
            })
        }

        function i(t, n) {
            e(["VSS/VSS"], function(e) {
                e.errorHandler.showError(t.message, n, null)
            })
        }
        return __extends(n, t), n.prototype.initialize = function() {
            $("<div id='" + p(this._typeName) + "' />").appendTo(this._element), t.prototype.initialize.call(this)
        }, n.load = function(e, t) {
            var n = function(e) {
                    var t;
                    t = null != e.customSettings.data && "" != e.customSettings.data ? "string" == typeof e.customSettings ? JSON.parse(e.customSettings) : JSON.parse(e.customSettings.data) : {};
                    return (t = t || {}).sortBy = t.sortBy || "Date", t.enableActions = t.enableActions || !1, t
                }(c.configuration = e),
                a = $("#" + p(this.getTypeName()));
            a.empty();
            var o = "";
            n.enableActions && (o = "<div class='comments'>Click on the icons to approve/reject</div>");
            var i = "releases-list-" + e.size.rowSpan,
                r = "." + i;
            4 === e.size.columnSpan && (i += " release-col-" + e.size.columnSpan);
            var s = VSS.getExtensionContext(),
                l = "https://marketplace.visualstudio.com/items?itemName=" + s.publisherId + "." + s.extensionId;
            $("<div class='widget'><h2 class='title'><span class='icon icon-rm-approvereject'></span>" + e.name + "<span id='RMApprovalCounter'/><span class='refreshWidget bowtie-icon bowtie-navigate-refresh'></span><div class='extensionVersion'><a title='What is this' target='_blank' href='" + l + "'>Release Approvals v" + s.version + "</a></div></h2>" + o + "<div class='" + i + "'></div></span></div>").appendTo(a);
            var u = a.children().find(r);
            return $(".refreshWidget").click(function() {
                v(u, n, t)
            }), v(u, n, t), f.WidgetStatusHelper.Success()
        }, n.getWidgetHandler = function(t) {
            return {
                load: function(e) {
                    return n.load(e, t)
                },
                reload: function(e) {
                    return this.load(e, t)
                }
            }
        }, n
    }(n.BaseControl);
    t.ReleaseApprovalsWidget = o
});